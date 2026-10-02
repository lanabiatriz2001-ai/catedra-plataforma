# Reformulação LEGIS/JURIS nativos — Entrega 1: base visual comum — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a base visual única do LEGIS e do JURIS nativos em `ios/vendor/design/`, compilada pelo Mac, pelo iPad e pelo Xcode Cloud. A base registra as fontes da casa no nativo, reúne as cores de ramo e de tribunal numa tabela só e faz `AppTheme`/`Palette` apontarem para ela. Uma catraca na CI impede que hex, tamanhos de fonte fixos e emoji voltem a crescer.

**Architecture:** A base é Swift puro, em arquivos pequenos, com as diferenças de plataforma em `#if os(iOS)`. O tema continua vindo da ponte JS → `ThemeState.t` que já existe em `main.swift`. `CatedraTheme`/`ThemeState` e os inicializadores de cor saem de `vendor/legis/Theme.swift` (cópias Mac e iPad) e passam a morar na base. `AppTheme` (LEGIS) e `Palette`/`Typo`/`RamoStyle` (JURIS) continuam existindo como apelidos que leem a base. Os testes Swift compilam só a base, com `swiftc`, no Mac, porque o projeto não tem XCTest. A catraca é um script Node que também roda na CI (Ubuntu).

**Tech Stack:** SwiftUI + CoreText (macOS 14+/iPadOS 17+), `swiftc` direto (sem projeto Xcode no build local), Node 24 (scripts e suíte), shell (`mac/build-app.sh`, `ios/build-ipad.sh`).

**Spec:** `docs/superpowers/specs/2026-09-25-redesenho-legis-juris-nativo-design.md` (§4 base visual; §8 entrega 1; §9 como provar).

## Global Constraints

- Português do Brasil com acentuação completa em código, comentários, commits e interface (CLAUDE.md).
- Nada de rede em tempo de execução: as fontes vêm de `web/fonts` dentro do bundle, nunca de CDN (CLAUDE.md, spec §4.2).
- A base mora em **`ios/vendor/design/`**; o Mac a inclui por `DESIGN_SOURCES` no `mac/build-app.sh`; `tests/xcode-cloud.mjs` continua passando sem alteração (spec §4.1).
- Escala tipográfica: `micro` 12 · `corpo` 15 · `titulo` 19 · `display` 26, com piso de 11 (spec §4.2). O tamanho de leitura continua sendo escolha da pessoa e não é tocado nesta entrega.
- Raios derivados de `--radius`: `card` = radius · `interno` = max(6, radius − 3) · `hero` = radius + 6 (spec §4.2).
- Cor-texto de ramo com contraste ≥ 4,5:1 sobre a superfície, calculada pelo mesmo passo do host (`_corTx`: escurece no claro e clareia no escuro, em passos de 3 %, até no máximo 85 %) (DESIGN.md, `scripts/verificar-cores-texto.mjs`).
- Sem faixa lateral colorida, sem emoji como ícone, sem hex fora da base (DESIGN.md, spec §4.2).
- Nenhum estado persistente novo. Nada em `_autosaveKeys`, `ARRAY_ID` ou nas chaves `catedra:` (spec §10).
- Toda mudança termina **instalada no Mac e no iPad**, com os builds UM de cada vez e sem editar `.swift` durante um build (CLAUDE.md).
- Commits em português, numa frase que diz o que mudou para a pessoa, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Mac e iPad são cópias divergentes: **toda edição em `vendor/legis` ou `vendor/juris` é feita nas duas árvores** (`mac/…` e `ios/…`), e as duas compilam.

## Review Focus

1. **Fonte que não registra no iPad** (woff2 recusado pelo CoreText do iOS ou pasta `web/fonts` ausente no bundle). Esperado: o texto aparece na fonte do sistema, sem tela em branco nem travamento. Teste: Task 3, "registrar pasta inexistente não quebra e `disponivel` fica falso", mais a captura do iPad na Task 7.
2. **Direção com fonte de display que não é serifada** (Terminal = JetBrains Mono; Fibra/Neon = Space Grotesk ou Inter Tight) ou `--display` vazio ou desconhecido. Esperado: os títulos usam a família da direção; se ela não for conhecida, mantêm a anterior. Teste: Task 3, `familiaDisplay(css:)`.
3. **Modo escuro.** Esperado: a cor-texto de cada ramo clareia e continua ≥ 4,5:1 sobre a superfície escura. Teste: Task 2, os 12 ramos × 2 modos.
4. **CSS malformado ou transparente vindo da ponte** (`rgba(…,0)`, string vazia, lixo). Esperado: é ignorado, o tema mantém o valor anterior e nada quebra. Teste: Task 1, `Color.hexDe(css:)`.
5. **Texto grande do sistema no iPad** (Dynamic Type). Esperado: a escala é aplicada uma vez só (`Font.custom(_:fixedSize:)` sobre o tamanho já escalado) e nunca fica abaixo de 11. Teste: Task 3, `escala(8) == 11` no Mac, mais a checagem manual com `content_size` no simulador na Task 7.

## Onde este plano ajusta a spec (e por quê)

- **Componentes (§4.2: cabeçalho, linha de item, chip, botões, estado vazio, barra do leitor, gaveta)** não entram nesta entrega. Cada um nasce na base (`ios/vendor/design/`) na entrega que primeiro o usa: `BarraLeitor` e `Gaveta` na 2, e os demais na 4 e na 5. Criá-los agora, sem nenhuma tela que os consuma, seria código sem teste de uso. O critério de fechamento da entrega 1 (§8) não os exige.
- **Cor-texto:** a spec fala em misturar a cor com a tinta a 72 %. O plano usa o **mesmo passo do host** (`_corTx`: escurece/clareia 3 % por vez até 4,5:1, com teto de 85 %), que já é conferido por `scripts/verificar-cores-texto.mjs`. A intenção é a mesma (≥ 4,5:1), e assim web e nativo dão a mesma cor.
- **Ponte:** `--ok/--warn/--danger` já chegam hoje; só o `Palette` do JURIS os ignorava (corrigido na Task 4). `--info` não existe no host, então o informativo fica como semântico fixo **dentro da base** (`DSCor.info`). O nome da direção (`data-dir`) não é lido nesta entrega porque nada o usa ainda; a família de display (`--display`), que é o que muda de fato por direção, é lida na Task 3.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `ios/vendor/design/Tema.swift` (novo) | `CatedraTheme`, `ThemeState`, `Color(hex: UInt32)`, `Color(css:)`, `Color.hexDe(css:)`. Vêm de `vendor/legis/Theme.swift`, com `surfaceHex` e `displayFamilia` novos. |
| `ios/vendor/design/Cor.swift` (novo) | Matemática de cor pura sobre `UInt32` (luminância, contraste, cor-texto) + `DS.corTexto(_:)` e os semânticos fixos `info`/`srs`. |
| `ios/vendor/design/CoresAcervo.swift` (novo) | A tabela única: `Ramo` (identidade, clara, `deNome`) e `CorTribunal`. |
| `ios/vendor/design/Tipografia.swift` (novo) | `DSFontes` (registro das woff2) e `DS` (escala, interface, display, mono, `familiaDisplay`) + `DSTipo`. |
| `ios/vendor/design/Medidas.swift` (novo) | `DSEspaco` e `DSRaio`. |
| `tests/design-nativo/main.swift` (novo) | Testes Swift da base (rodam no Mac). |
| `scripts/testar-design-nativo.sh` (novo) | Compila a base com os testes via `swiftc` e roda. |
| `scripts/verificar-design-nativo.mjs` (novo) | Catraca: hex, `.white/.black`, `.system(size:)` e emoji fora da base. |
| `scripts/design-nativo-base.json` (novo) | Linha de base da catraca (só desce). |
| `tests/design-nativo.mjs` (novo) | Módulo da suíte (`testarDesignNativo(ok)`): catraca + testes Swift no Mac. |
| `mac/build-app.sh` | Inclui `ios/vendor/design` no `swiftc`. |
| `{mac,ios}/vendor/legis/Theme.swift` | Perdem os tipos movidos; `LawCategory.color/colorLight` e `AppTheme` leem a base. |
| `{mac,ios}/vendor/juris/Design/JurisTheme.swift` | `RamoStyle`, `Palette` (semânticos, raios, tribunais) e `Typo` leem a base. |
| `{mac,ios}/Sources/main.swift` | Registro das fontes no início; a ponte grava `surfaceHex` e `displayFamilia`. |
| `scripts/verificar-cores-ramo.mjs` | Compara a web com a tabela única (e não mais com os dois `Theme.swift`). |
| `scripts/build-macos.mjs`, `tests/run.mjs`, `.github/workflows/testes.yml` | Ligam a catraca ao build, à suíte e à CI. |
| 7 telas × 2 árvores | Tiram os emojis usados como ícone (Task 6). |

---

### Task 0: Preparar a branch

**Files:** nenhum.

- [ ] **Step 1: Renomear a branch do worktree e conferir**

A especificação e este plano já estão commitados no worktree `.claude/worktrees/redesenho-legis-juris`. O PR da entrega 1 leva os três juntos.

```bash
cd ~/catedra-plataforma-main/.claude/worktrees/redesenho-legis-juris
git branch -m redesenho-legis-juris-spec redesenho-nativo-1-base && git branch --show-current
```
Expected: `redesenho-nativo-1-base`

- [ ] **Step 2: Conferir que os dois builds compilam ANTES de mudar qualquer coisa**

```bash
bash mac/build-app.sh 2>&1 | tail -3
```
Depois que ele terminar (nunca os dois juntos):
```bash
bash ios/build-ipad.sh 2>&1 | tail -3
```
Expected: os dois terminam sem `error:`. Se algum falhar já aqui, pare e informe: a falha não é desta entrega.

---

### Task 1: A base nasce — tema e cor movidos para `ios/vendor/design`

**Files:**
- Create: `ios/vendor/design/Tema.swift`
- Create: `ios/vendor/design/Cor.swift`
- Create: `tests/design-nativo/main.swift`
- Create: `scripts/testar-design-nativo.sh`
- Modify: `mac/vendor/legis/Theme.swift` (remove `struct CatedraTheme`, `enum ThemeState`, `init(hex: UInt32)`, `init?(css:)`; `AppTheme.info/srs` passam a ler `DSCor`)
- Modify: `ios/vendor/legis/Theme.swift` (o mesmo)
- Modify: `mac/build-app.sh:77-78` e `:114`

**Interfaces:**
- Produces:
  - `struct CatedraTheme` (os mesmos campos de hoje + `var surfaceHex: UInt32 = 0xFFFDF8` + `var displayFamilia: String = "Spectral"`)
  - `enum ThemeState { static var t: CatedraTheme }`
  - `Color.init(hex: UInt32)`, `Color.init?(css: String)`, `static func Color.hexDe(css: String) -> UInt32?`
  - `enum DSCor { static let info: UInt32; static let srs: UInt32; static func luminancia(_: UInt32) -> Double; static func contraste(_: UInt32, _: UInt32) -> Double; static func texto(identidade: UInt32, superficie: UInt32, escuro: Bool) -> UInt32 }`
  - `enum DS { static func corTexto(_ identidade: UInt32) -> Color }` (o `enum DS` nasce aqui; a Task 3 acrescenta membros por `extension DS`)

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/design-nativo/main.swift`:

```swift
// Testes da base visual nativa (ios/vendor/design). Compilados só com a base, no Mac,
// por scripts/testar-design-nativo.sh — o projeto não tem XCTest. Saída: uma linha ✓/✗
// por conferência; código de saída 1 se alguma falhar.
import Foundation
import SwiftUI

var falhas = 0
func confere(_ c: Bool, _ rotulo: String) {
    print((c ? "✓ " : "✗ ") + rotulo)
    if !c { falhas += 1 }
}
let pastaFontes = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ""

// ── Tema e cor ──────────────────────────────────────────────────────────────
confere(Color.hexDe(css: "#fffdf8") == 0xFFFDF8, "hexDe lê #rrggbb")
confere(Color.hexDe(css: "#abc") == 0xAABBCC, "hexDe expande #rgb")
confere(Color.hexDe(css: " rgb(32, 29, 23) ") == 0x201D17, "hexDe lê rgb() com espaços")
confere(Color.hexDe(css: "rgba(0, 0, 0, 0)") == nil, "hexDe ignora cor transparente")
confere(Color.hexDe(css: "") == nil && Color.hexDe(css: "lixo") == nil, "hexDe ignora vazio e lixo")
confere(Color(css: "lixo") == nil, "Color(css:) devolve nil para lixo")
confere(abs(DSCor.contraste(0x000000, 0xFFFFFF) - 21) < 0.01, "contraste preto × branco = 21:1")
confere(abs(DSCor.contraste(0xFFFDF8, 0xFFFDF8) - 1) < 0.001, "contraste de uma cor com ela mesma = 1:1")
let tx = DSCor.texto(identidade: 0x65A30D, superficie: 0xFFFDF8, escuro: false)
confere(DSCor.contraste(tx, 0xFFFDF8) >= 4.5, "cor-texto do lima escurece até 4,5:1 no claro")
confere(ThemeState.t.surfaceHex == 0xFFFDF8 && ThemeState.t.displayFamilia == "Spectral",
        "tema de partida é a Planilha (superfície #fffdf8, display Spectral)")

// (Tasks 2 e 3 acrescentam blocos aqui, antes do fechamento.)

print(falhas == 0 ? "\nbase visual: tudo certo" : "\nbase visual: \(falhas) falha(s)")
exit(falhas == 0 ? 0 : 1)
```

Crie `scripts/testar-design-nativo.sh`:

```bash
#!/bin/bash
# Compila a base visual nativa (ios/vendor/design) junto com tests/design-nativo/main.swift
# e roda no Mac. É o único lugar em que a base compila SOZINHA — se ela depender de algo do
# LEGIS ou do JURIS, este script quebra, e isso é o que se quer: a base não depende de tela.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mktemp -d)/testes-design-nativo"
SDK="$(xcrun --sdk macosx --show-sdk-path)"
xcrun --sdk macosx swiftc -sdk "$SDK" "$ROOT"/ios/vendor/design/*.swift \
  "$ROOT/tests/design-nativo/main.swift" -o "$OUT"
"$OUT" "$ROOT/fonts"
```

```bash
chmod +x scripts/testar-design-nativo.sh
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bash scripts/testar-design-nativo.sh`
Expected: FAIL. O `swiftc` não acha arquivos em `ios/vendor/design/*.swift` ("no such file") ou não acha `DSCor`/`hexDe`.

- [ ] **Step 3: Criar `ios/vendor/design/Tema.swift`**

Mova para cá, **sem mudar o comportamento**, os blocos `struct CatedraTheme { … }` (com o `static let fallback`), `enum ThemeState { … }` e, da `extension Color`, `init(hex: UInt32)` e `init?(css raw: String)`, que hoje estão em `mac/vendor/legis/Theme.swift`. As versões do Mac e do iPad desses blocos são idênticas; confira com `diff`. Acrescente os dois campos e a função nova:

```swift
import SwiftUI

/// Tema ESPELHADO do Cátedra (base visual comum — LEGIS e JURIS, Mac e iPad).
/// Os tokens são lidos das variáveis CSS computadas do WebView (`main.swift`, ponte de tema)
/// e gravados em `ThemeState.t`. Mora em ios/vendor/design: o iPad e o Xcode Cloud compilam
/// ios/vendor inteiro, e o mac/build-app.sh inclui esta pasta — um arquivo só, dois alvos.
struct CatedraTheme {
    // … (campos existentes, copiados exatamente como estão em vendor/legis/Theme.swift) …

    /// Superfície atual em 0xRRGGBB — é contra ela que a cor-texto de ramo é calculada.
    /// A ponte grava a partir de `--surface`; o padrão é a superfície da Planilha.
    var surfaceHex: UInt32 = 0xFFFDF8
    /// Família de display da direção ativa (Spectral, Inter Tight, Space Grotesk ou
    /// JetBrains Mono), lida de `--display` pela ponte. Padrão: a identidade Planilha.
    var displayFamilia: String = "Spectral"

    // static let fallback = … (copiado exatamente como está)
}

// enum ThemeState { … } (copiado exatamente como está)

extension Color {
    // init(hex: UInt32) { … } (copiado exatamente como está)
    // init?(css raw: String) { … } (copiado exatamente como está)

    /// O mesmo parse de `init?(css:)`, mas devolvendo 0xRRGGBB — para a matemática de
    /// contraste, que trabalha em inteiros. Transparente (alfa 0) não diz nada: nil.
    static func hexDe(css raw: String) -> UInt32? {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.isEmpty { return nil }
        if s.hasPrefix("#") {
            s.removeFirst()
            if s.count == 3 { s = s.map { "\($0)\($0)" }.joined() }
            guard s.count == 6, let v = UInt32(s, radix: 16) else { return nil }
            return v
        }
        guard s.hasPrefix("rgb"), let open = s.firstIndex(of: "("), let close = s.firstIndex(of: ")")
        else { return nil }
        let partes = s[s.index(after: open)..<close].split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
        guard partes.count >= 3, let r = Double(partes[0]), let g = Double(partes[1]), let b = Double(partes[2])
        else { return nil }
        if partes.count >= 4, let a = Double(partes[3]), a == 0 { return nil }
        func c(_ x: Double) -> UInt32 { UInt32(max(0, min(255, x.rounded()))) }
        return (c(r) << 16) | (c(g) << 8) | c(b)
    }
}
```

Os comentários `// … (copiado exatamente como está)` indicam **onde** colar o código movido. Não os deixe no arquivo: substitua cada um pelo bloco correspondente.

- [ ] **Step 4: Criar `ios/vendor/design/Cor.swift`**

```swift
import SwiftUI

/// Matemática de cor da base visual, em inteiros 0xRRGGBB — testável sem tela.
/// A cor-texto repete o passo do host (`_corTx` no Catedra.dc.html, conferido também por
/// scripts/verificar-cores-texto.mjs): escurece (claro) ou clareia (escuro) em passos de 3 %
/// até 4,5:1 sobre a superfície, com teto de 85 %. Cor-identidade ≠ cor-texto (DESIGN.md).
enum DSCor {
    /// Informativo e revisão espaçada — os dois semânticos que o host não publica como
    /// variável CSS. Moram aqui para não haver hex fora da base.
    static let info: UInt32 = 0x2563EB
    static let srs: UInt32 = 0x7C3AED

    static func canais(_ h: UInt32) -> (Double, Double, Double) {
        (Double((h >> 16) & 0xFF), Double((h >> 8) & 0xFF), Double(h & 0xFF))
    }
    static func hex(_ r: Double, _ g: Double, _ b: Double) -> UInt32 {
        func c(_ x: Double) -> UInt32 { UInt32(max(0, min(255, x.rounded()))) }
        return (c(r) << 16) | (c(g) << 8) | c(b)
    }
    static func luminancia(_ h: UInt32) -> Double {
        let (r, g, b) = canais(h)
        func lin(_ v: Double) -> Double { let x = v / 255; return x <= 0.03928 ? x / 12.92 : pow((x + 0.055) / 1.055, 2.4) }
        return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    }
    static func contraste(_ a: UInt32, _ b: UInt32) -> Double {
        let x = luminancia(a), y = luminancia(b)
        return (max(x, y) + 0.05) / (min(x, y) + 0.05)
    }
    static func escurecer(_ h: UInt32, _ f: Double) -> UInt32 {
        let (r, g, b) = canais(h); return hex(r * (1 - f), g * (1 - f), b * (1 - f))
    }
    static func clarear(_ h: UInt32, _ f: Double) -> UInt32 {
        let (r, g, b) = canais(h); return hex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f)
    }
    static func texto(identidade: UInt32, superficie: UInt32, escuro: Bool) -> UInt32 {
        var f = 0.0, saida = identidade
        while f < 0.85 && contraste(saida, superficie) < 4.5 {
            f += 0.03
            saida = escuro ? clarear(identidade, f) : escurecer(identidade, f)
        }
        return saida
    }
}

/// Fachada da base visual. Tipografia (Tipografia.swift) entra por `extension DS`.
enum DS {
    /// Cor de identidade (ramo, tribunal) pronta para virar TEXTO no tema atual.
    static func corTexto(_ identidade: UInt32) -> Color {
        Color(hex: DSCor.texto(identidade: identidade, superficie: ThemeState.t.surfaceHex,
                               escuro: ThemeState.t.isDark))
    }
}
```

- [ ] **Step 5: Tirar os blocos movidos dos dois `Theme.swift` e apontar `info`/`srs` para a base**

Em `mac/vendor/legis/Theme.swift` **e** em `ios/vendor/legis/Theme.swift`:
- apague `struct CatedraTheme { … }` inteiro (inclusive o `static let fallback`) e `enum ThemeState { … }`;
- na `extension Color` apague `init(hex: UInt32) { … }` e `init?(css raw: String) { … }`, mantendo `dynamic`, `vibrantGradient` e `blended`;
- em `enum AppTheme`, troque:

```swift
    static let info: Color  = Color(hex: 0x2563EB)
    static let srs: Color   = Color(hex: 0x7C3AED)
```
por
```swift
    static var info: Color { Color(hex: DSCor.info) }
    static var srs: Color  { Color(hex: DSCor.srs) }
```

- [ ] **Step 6: Incluir a base no build do Mac**

Em `mac/build-app.sh`, logo abaixo de `JURIS_SOURCES=$(find "$HERE/vendor/juris" -name '*.swift')`:

```bash
# Base visual comum (tema, cor, tipografia): mora em ios/vendor/design porque o iPad e o
# Xcode Cloud compilam ios/vendor inteiro. Um arquivo só para os dois alvos.
DESIGN_SOURCES=$(find "$ROOT/ios/vendor/design" -name '*.swift')
```

E na linha do `swiftc` do app (hoje `… $LEGIS_SOURCES $JURIS_SOURCES "$HERE/Sources/main.swift" …`) acrescente `$DESIGN_SOURCES` logo depois de `$JURIS_SOURCES`.

- [ ] **Step 7: Rodar os testes e ver passar**

Run: `bash scripts/testar-design-nativo.sh`
Expected: 10 linhas `✓` e `base visual: tudo certo`.

- [ ] **Step 8: Compilar os dois alvos (um de cada vez)**

```bash
bash mac/build-app.sh 2>&1 | grep -E "error:|→ 5/5|✓" | tail -5
```
Depois:
```bash
bash ios/build-ipad.sh 2>&1 | grep -E "error:|✓" | tail -5
```
Expected: nenhum `error:`. Se aparecer "invalid redeclaration of 'CatedraTheme'" ou de `init(hex:)`, sobrou um bloco num dos `Theme.swift`; se aparecer "cannot find 'ThemeState' in scope" no Mac, faltou `$DESIGN_SOURCES` no `swiftc`.

- [ ] **Step 9: Conferir que o Xcode Cloud continua compilando a pasta**

Run: `node tests/xcode-cloud.mjs`
Expected: todas as linhas `✓` (a pasta nova fica dentro de `ios/vendor`, que é sincronizada).

- [ ] **Step 10: Commit**

```bash
git add ios/vendor/design tests/design-nativo scripts/testar-design-nativo.sh mac/build-app.sh mac/vendor/legis/Theme.swift ios/vendor/legis/Theme.swift
git commit -m "O tema do LEGIS e do JURIS passa a morar num arquivo só, compilado pelo Mac e pelo iPad

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Tabela única de cores de ramo e tribunal

**Files:**
- Create: `ios/vendor/design/CoresAcervo.swift`
- Modify: `{mac,ios}/vendor/legis/Theme.swift` (`extension LawCategory`: `color`, `colorLight`)
- Modify: `{mac,ios}/vendor/juris/Design/JurisTheme.swift` (`RamoStyle.stops`, `Palette.corDeTribunal`, `Palette.corDeCentral`, `Palette.fonteDOD`)
- Modify: `{mac,ios}/Sources/main.swift` (`applyCatedraTheme`: grava `surfaceHex`)
- Modify: `scripts/verificar-cores-ramo.mjs`
- Test: `tests/design-nativo/main.swift`

**Interfaces:**
- Consumes: `DSCor.texto`, `DSCor.contraste`, `Color.hexDe(css:)`, `CatedraTheme.surfaceHex` (Task 1)
- Produces:
  - `enum Ramo: String, CaseIterable { case constitucional, civil, penal, trabalho, previdenciario, tributario, empresarial, administrativo, consumidor, ambiental, digital, internacional, especial; var identidade: UInt32; var clara: UInt32; static func deNome(_ nome: String?) -> Ramo? }`
  - `enum CorTribunal { static func identidade(_ nome: String) -> UInt32?; static func clara(_ nome: String) -> UInt32?; static let dod: UInt32; static let dodClara: UInt32 }`
  - `LawCategory.ramo: Ramo?`

- [ ] **Step 1: Escrever o teste que falha**

Em `tests/design-nativo/main.swift`, no lugar do comentário `// (Tasks 2 e 3 acrescentam blocos aqui, antes do fechamento.)`, insira (mantendo o comentário logo abaixo do bloco):

```swift
// ── Tabela única de ramos e tribunais ──────────────────────────────────────
confere(Ramo.allCases.count == 13, "13 ramos na tabela (12 famílias da web + Leis Especiais)")
confere(Ramo.constitucional.identidade == 0x2563EB && Ramo.penal.identidade == 0xE11D48
        && Ramo.civil.identidade == 0x0D9488 && Ramo.internacional.identidade == 0x0284C7,
        "valores da tabela iguais aos que o LEGIS e o JURIS usavam")
for r in Ramo.allCases {
    let claro = DSCor.texto(identidade: r.identidade, superficie: 0xFFFDF8, escuro: false)
    let escuro = DSCor.texto(identidade: r.identidade, superficie: 0x201D17, escuro: true)
    confere(DSCor.contraste(claro, 0xFFFDF8) >= 4.5 && DSCor.contraste(escuro, 0x201D17) >= 4.5,
            "\(r.rawValue): cor-texto ≥ 4,5:1 no claro e no escuro")
}
confere(Ramo.deNome("Direito Constitucional") == .constitucional, "deNome: Constitucional")
confere(Ramo.deNome("Direito Processual Penal") == .penal, "deNome: Processual Penal é penal")
confere(Ramo.deNome("Direito Processual Civil") == .civil, "deNome: Processual Civil é civil")
confere(Ramo.deNome("Direito Previdenciário") == .previdenciario, "deNome ignora acento")
confere(Ramo.deNome("Direito Eleitoral") == .administrativo, "deNome: Eleitoral cai em administrativo (como antes)")
confere(Ramo.deNome("Direitos Humanos") == .internacional, "deNome: Direitos Humanos cai em internacional")
confere(Ramo.deNome(nil) == nil && Ramo.deNome("Direito Canônico") == nil, "deNome: nil ou desconhecido devolve nil")
confere(CorTribunal.identidade("STF") == 0x1D4ED8 && CorTribunal.identidade("STJ") == 0x0D9488
        && CorTribunal.identidade("XYZ") == nil, "cores de tribunal e ausência para tribunal desconhecido")
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bash scripts/testar-design-nativo.sh`
Expected: FAIL de compilação: "cannot find 'Ramo' in scope".

- [ ] **Step 3: Criar `ios/vendor/design/CoresAcervo.swift`**

```swift
import Foundation

/// A tabela ÚNICA de cor por ramo do direito — a paleta "vitrine" (DESIGN.md). Antes ela
/// vivia duas vezes em cada alvo (LawCategory.color no LEGIS, RamoStyle.stops no JURIS),
/// quatro cópias que o scripts/verificar-cores-ramo.mjs precisava vigiar. Agora LEGIS e
/// JURIS, Mac e iPad leem daqui; a checagem compara só esta tabela com CT_CORES_RAMO da web.
/// `identidade` pinta preenchimento/borda; como TEXTO use `DS.corTexto(ramo.identidade)`.
enum Ramo: String, CaseIterable {
    case constitucional, civil, penal, trabalho, previdenciario, tributario, empresarial,
         administrativo, consumidor, ambiental, digital, internacional, especial

    var identidade: UInt32 {
        switch self {
        case .constitucional: return 0x2563EB   // azul royal
        case .civil:          return 0x0D9488   // teal
        case .penal:          return 0xE11D48   // rosé
        case .trabalho:       return 0xD97706   // âmbar
        case .previdenciario: return 0xDB2777   // rosa
        case .tributario:     return 0x7C3AED   // roxo
        case .empresarial:    return 0x65A30D   // lima
        case .administrativo: return 0x4F46E5   // índigo
        case .consumidor:     return 0xEA580C   // laranja
        case .ambiental:      return 0x16A34A   // verde
        case .digital:        return 0xC026D3   // fúcsia
        case .internacional:  return 0x0284C7   // azul-céu (escurecido p/ contraste AA — igual à web)
        case .especial:       return 0x64748B   // grafite
        }
    }

    /// Segunda parada do gradiente da matéria (tom mais claro).
    var clara: UInt32 {
        switch self {
        case .constitucional: return 0x38BDF8
        case .civil:          return 0x2DD4BF
        case .penal:          return 0xFB7185
        case .trabalho:       return 0xFBBF24
        case .previdenciario: return 0xF472B6
        case .tributario:     return 0xA78BFA
        case .empresarial:    return 0xA3E635
        case .administrativo: return 0x818CF8
        case .consumidor:     return 0xFB923C
        case .ambiental:      return 0x4ADE80
        case .digital:        return 0xE879F9
        case .internacional:  return 0x7DD3FC
        case .especial:       return 0x94A3B8
        }
    }

    /// Ramo a partir do nome livre que vem do acervo ("Direito Processual Penal"…). A ordem
    /// é a do antigo RamoStyle.stops e importa: "Processual Civil" não pode cair em penal,
    /// e "civil" fica por último. "Leis Especiais" não tem gatilho de nome (só o LEGIS a usa).
    static func deNome(_ nome: String?) -> Ramo? {
        let n = (nome ?? "")
            .folding(options: .diacriticInsensitive, locale: Locale(identifier: "pt_BR"))
            .lowercased()
        if n.isEmpty { return nil }
        func tem(_ partes: String...) -> Bool { partes.contains { n.contains($0) } }
        if tem("constituc")                          { return .constitucional }
        if tem("penal", "criminal")                  { return .penal }
        if tem("trabalh")                            { return .trabalho }
        if tem("previden")                           { return .previdenciario }
        if tem("tribut")                             { return .tributario }
        if tem("empresar", "econom")                 { return .empresarial }
        if tem("administr", "eleitor")               { return .administrativo }
        if tem("consum")                             { return .consumidor }
        if tem("ambient")                            { return .ambiental }
        if tem("digital", "propriedade intelectual") { return .digital }
        if tem("internacional", "humanos")           { return .internacional }
        if tem("civil")                              { return .civil }
        return nil
    }
}

/// Cor de identidade por tribunal — a mesma do CátedraJURIS da web (TRIBC). Fixa: a
/// identidade do tribunal não muda com o tema. `clara` é a variante para ícone sobre o
/// navy da lateral. DOD não é tribunal, mas tem identidade própria (âmbar).
enum CorTribunal {
    static func identidade(_ nome: String) -> UInt32? {
        switch nome {
        case "STF":  return 0x1D4ED8   // azul
        case "STJ":  return 0x0D9488   // teal
        case "TSE":  return 0x7C3AED   // roxo
        case "TJRO": return 0x64748B   // ardósia
        case "TCU":  return 0x0F7A57   // verde-cofre
        default:     return nil
        }
    }
    static func clara(_ nome: String) -> UInt32? {
        switch nome {
        case "STF":  return 0x739EFA
        case "STJ":  return 0x47CCB3
        case "TSE":  return 0xA98CFA
        case "TJRO": return 0x9EADC7
        case "TCU":  return 0x3DB88C
        default:     return nil
        }
    }
    static let dod: UInt32 = 0xC2790C
    static let dodClara: UInt32 = 0xF2B859
}
```

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `bash scripts/testar-design-nativo.sh`
Expected: todos `✓`, incluindo as 13 linhas "cor-texto ≥ 4,5:1". Se algum ramo falhar no escuro, **não** mude a identidade: o teto de 85 % é o mesmo do host, e a falha indica um ramo que também falharia na web. Pare e informe.

- [ ] **Step 5: LEGIS lê a tabela**

Em `mac/vendor/legis/Theme.swift` **e** `ios/vendor/legis/Theme.swift`, substitua na `extension LawCategory` os dois `switch` (`var color` e `var colorLight`) por:

```swift
    /// Ramo da tabela única (ios/vendor/design/CoresAcervo.swift). "Minhas Normas" não tem
    /// ramo: segue o acento da plataforma.
    var ramo: Ramo? {
        switch self {
        case .constitucional: return .constitucional
        case .civil:          return .civil
        case .penal:          return .penal
        case .trabalhista:    return .trabalho
        case .previdenciario: return .previdenciario
        case .tributario:     return .tributario
        case .empresarial:    return .empresarial
        case .administrativo: return .administrativo
        case .consumidor:     return .consumidor
        case .ambiental:      return .ambiental
        case .digital:        return .digital
        case .internacional:  return .internacional
        case .especial:       return .especial
        case .personalizada:  return nil
        }
    }

    /// Linguagem "vitrine": cada matéria tem identidade de COR própria.
    var color: Color { ramo.map { Color(hex: $0.identidade) } ?? ThemeState.t.accent }

    /// Segunda parada do gradiente da matéria (tom mais claro/vibrante).
    var colorLight: Color { ramo.map { Color(hex: $0.clara) } ?? ThemeState.t.accent.opacity(0.75) }
```

- [ ] **Step 6: JURIS lê a tabela**

Em `mac/vendor/juris/Design/JurisTheme.swift` **e** `ios/vendor/juris/Design/JurisTheme.swift`:

Substitua o corpo de `RamoStyle.stops(_:)` por:
```swift
    static func stops(_ ramo: String?) -> [Color] {
        guard let r = Ramo.deNome(ramo) else { return [Palette.accent, Palette.accentSoft] }
        return [Color(hex: r.identidade), Color(hex: r.clara)]
    }
```

Substitua `corDeTribunal`, `corDeCentral` e `fonteDOD` em `Palette` por:
```swift
    static func corDeTribunal(_ nome: String) -> Color {
        CorTribunal.identidade(nome).map { Color(hex: $0) } ?? ThemeState.t.accent
    }

    /// Cor de identidade de uma Central — a mesma do tribunal que ela reúne.
    /// `clara`: variante clareada para ícones sobre o navy da sidebar (mesma família).
    static func corDeCentral(_ c: JurisCentral, clara: Bool = false) -> Color {
        let nome: String
        switch c {
        case .stf: nome = "STF"
        case .stj: nome = "STJ"
        case .tse: nome = "TSE"
        case .especificos: nome = "TJRO"
        case .contas: nome = "TCU"
        case .outros: return Color(hex: clara ? CorTribunal.dodClara : CorTribunal.dod)
        }
        if clara, let h = CorTribunal.clara(nome) { return Color(hex: h) }
        return corDeTribunal(nome)
    }
```
e
```swift
    static var fonteDOD: Color         { Color(hex: CorTribunal.dod) }   // âmbar — não é tribunal
```

Atenção: aqui `Color(hex:)` recebe `UInt32` (o inicializador da base). O `Color(hex: String)` do JURIS continua existindo para os outros usos.

- [ ] **Step 7: A ponte grava a superfície em `surfaceHex`**

Em `mac/Sources/main.swift` (`applyCatedraTheme`, logo depois de `if let c = col("surface")  { t.surface = c }`) **e** em `ios/Sources/main.swift` (no mesmo ponto da função equivalente, perto da linha 440):

```swift
        if let h = (d["surface"] as? String).flatMap(Color.hexDe(css:)) { t.surfaceHex = h }
```

- [ ] **Step 8: Trocar a fonte da checagem de paleta**

Em `scripts/verificar-cores-ramo.mjs`, substitua o laço `for (const lado of ['mac', 'ios']) { … }` e a comparação por uma leitura da tabela única, com uma trava que impede tabelas paralelas de voltar:

```js
// Nativo: UMA tabela (ios/vendor/design/CoresAcervo.swift), compilada pelo Mac e pelo iPad.
const tabela = {};
const mTab = ler('ios/vendor/design/CoresAcervo.swift').match(/var identidade: UInt32 \{[\s\S]*?\n    \}/);
if (!mTab) throw new Error('bloco var identidade não encontrado em ios/vendor/design/CoresAcervo.swift');
for (const [, caso, hex] of mTab[0].matchAll(/case \.(\w+):\s*return 0x([0-9A-Fa-f]{6})/g)) tabela[caso] = '#' + hex.toUpperCase();

// Trava: nenhum Theme.swift / JurisTheme.swift volta a ter tabela própria de ramo.
const paralelas = [];
for (const lado of ['mac', 'ios']) {
  const legis = ler(`${lado}/vendor/legis/Theme.swift`).match(/var color: Color \{[\s\S]*?\n    \}/);
  if (legis && /Color\(hex: 0x/.test(legis[0])) paralelas.push(`${lado}/vendor/legis/Theme.swift (LawCategory.color)`);
  if (/if hit\([^)]*\)\s*\{ return \[Color\(hex: "#/.test(ler(`${lado}/vendor/juris/Design/JurisTheme.swift`)))
    paralelas.push(`${lado}/vendor/juris/Design/JurisTheme.swift (RamoStyle.stops)`);
}

const erros = paralelas.map((p) => `tabela de ramo paralela reapareceu em ${p} — use ios/vendor/design/CoresAcervo.swift`);
for (const f of FAMILIAS) {
  const w = web[f], n = tabela[f];
  if (!w || !n) { erros.push(`${f}: ausente em ${!w ? 'web' : ''}${!w && !n ? ', ' : ''}${!n ? 'tabela nativa' : ''}`); continue; }
  if (w !== n) erros.push(`${f}: web ${w} · nativo ${n}`);
}
if (erros.length) {
  throw new Error('\n✗ BUILD ABORTADO — paleta de ramos divergiu entre web e nativo:\n    '
    + erros.join('\n    ')
    + '\n  Alinhe CT_CORES_RAMO (Catedra.dc.html) e ios/vendor/design/CoresAcervo.swift e rode de novo.');
}
console.log(`✓ paleta vitrine consistente — web × tabela nativa única (${FAMILIAS.length} famílias)`);
```

Apague também a constante `CHAVE` e a variável `fontes`, que deixam de ser usadas (a web e a tabela usam os mesmos nomes de família, `trabalho` inclusive). Atualize o comentário do topo: "a cor por ramo vive em DOIS lugares — CT_CORES_RAMO na web e `ios/vendor/design/CoresAcervo.swift` no nativo (Mac e iPad)".

- [ ] **Step 9: Rodar a checagem de paleta**

Run: `node scripts/verificar-cores-ramo.mjs`
Expected: `✓ paleta vitrine consistente — web × tabela nativa única (12 famílias)`

Controle: troque temporariamente `0x2563EB` por `0x2563EC` em `CoresAcervo.swift` e rode de novo. O esperado é `constitucional: web #2563EB · nativo #2563EC`. Desfaça a troca.

- [ ] **Step 10: Compilar os dois alvos (um de cada vez)**

```bash
bash mac/build-app.sh 2>&1 | grep -E "error:|paleta|✓" | tail -5
```
Depois:
```bash
bash ios/build-ipad.sh 2>&1 | grep -E "error:|✓" | tail -5
```
Expected: sem `error:`, e a linha `✓ paleta vitrine consistente` aparece no build do Mac (o `build-macos.mjs` importa a checagem).

- [ ] **Step 11: Commit**

```bash
git add ios/vendor/design/CoresAcervo.swift tests/design-nativo/main.swift mac/vendor/legis/Theme.swift ios/vendor/legis/Theme.swift mac/vendor/juris/Design/JurisTheme.swift ios/vendor/juris/Design/JurisTheme.swift mac/Sources/main.swift ios/Sources/main.swift scripts/verificar-cores-ramo.mjs
git commit -m "As cores de ramo e de tribunal passam a vir de uma tabela só no LEGIS e no JURIS, com cor de texto legível nos dois modos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Fontes da casa no nativo e a escala tipográfica

**Files:**
- Create: `ios/vendor/design/Tipografia.swift`
- Create: `ios/vendor/design/Medidas.swift`
- Modify: `mac/Sources/main.swift` (`applicationDidFinishLaunching`, e `applyCatedraTheme` perto da linha 1485)
- Modify: `ios/Sources/main.swift` (`application(_:didFinishLaunchingWithOptions:)` perto da linha 1753, e a ponte perto da linha 443)
- Test: `tests/design-nativo/main.swift`

**Interfaces:**
- Consumes: `ThemeState.t.displayFamilia`, `ThemeState.t.displaySerif`, `ThemeState.t.radius` (Task 1)
- Produces:
  - `enum DSFontes { static let familiasDaCasa: [String]; static var registradas: Set<String> { get }; static func pastaDoApp() -> URL?; @discardableResult static func registrar(pasta: URL?) -> Set<String>; static func disponivel(_ familia: String) -> Bool }`
  - `enum DSTipo: CGFloat { case micro = 12, corpo = 15, titulo = 19, display = 26 }`
  - `extension DS { static func escala(_: CGFloat) -> CGFloat; static func interface(_: CGFloat, _: Font.Weight) -> Font; static func display(_: CGFloat, _: Font.Weight) -> Font; static func mono(_: CGFloat, _: Font.Weight) -> Font; static func tipo(_: DSTipo, _: Font.Weight) -> Font; static func familiaDisplay(css: String) -> String? }`
  - `enum DSEspaco { static let e1…e7: CGFloat }`, `enum DSRaio { static var card, interno, hero: CGFloat }`

- [ ] **Step 1: Escrever o teste que falha**

Em `tests/design-nativo/main.swift`, antes do comentário `// (Tasks 2 e 3 acrescentam blocos aqui, antes do fechamento.)`:

```swift
// ── Fontes e escala ─────────────────────────────────────────────────────────
confere(DSFontes.registrar(pasta: URL(fileURLWithPath: "/nao/existe")).isEmpty
        && !DSFontes.disponivel("Spectral"),
        "registrar pasta inexistente não quebra e nada fica disponível")
let reg = DSFontes.registrar(pasta: URL(fileURLWithPath: pastaFontes, isDirectory: true))
for f in DSFontes.familiasDaCasa {
    confere(reg.contains(f) && DSFontes.disponivel(f), "fonte da casa registrada a partir do woff2: \(f)")
}
confere(DSFontes.registrar(pasta: URL(fileURLWithPath: pastaFontes, isDirectory: true)) == reg,
        "registrar de novo (já registradas) não perde nenhuma família")
confere(!DSFontes.disponivel("Comic Sans MS"), "família de fora da casa não conta como disponível")
confere(DS.familiaDisplay(css: "'Spectral', Georgia, serif") == "Spectral", "display da Planilha/Tribunal")
confere(DS.familiaDisplay(css: "'Inter Tight', 'Inter', sans-serif") == "Inter Tight", "display do Neon/Aurora")
confere(DS.familiaDisplay(css: "'Space Grotesk', sans-serif") == "Space Grotesk", "display do Fibra/Solar")
confere(DS.familiaDisplay(css: "'JetBrains Mono', monospace") == "JetBrains Mono", "display do Terminal")
confere(DS.familiaDisplay(css: "") == nil && DS.familiaDisplay(css: "Comic Sans") == nil,
        "display vazio ou desconhecido devolve nil (a ponte mantém o anterior)")
confere(DS.escala(8) == 11 && DS.escala(15) == 15, "escala: piso de 11 e tamanho normal intacto (Mac)")
confere(DSTipo.micro.rawValue == 12 && DSTipo.corpo.rawValue == 15
        && DSTipo.titulo.rawValue == 19 && DSTipo.display.rawValue == 26, "escala de 4 degraus da interface")
ThemeState.t.radius = 12
confere(DSRaio.card == 12 && DSRaio.interno == 9 && DSRaio.hero == 18, "raios derivados de --radius")
ThemeState.t.radius = 6
confere(DSRaio.interno == 6, "raio interno nunca abaixo de 6")
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bash scripts/testar-design-nativo.sh`
Expected: FAIL de compilação: "cannot find 'DSFontes' in scope".

- [ ] **Step 3: Criar `ios/vendor/design/Tipografia.swift`**

```swift
import SwiftUI
import CoreText
#if os(iOS)
import UIKit
#endif

/// As fontes da casa no NATIVO. Elas já vão no bundle, em web/fonts (woff2), para o
/// WebView; o CoreText registra woff2 direto (conferido em 25/09/2026 no macOS 27).
/// Registro por processo, no início do app. Se falhar, a tipografia cai para a fonte do
/// sistema — nunca tela em branco.
enum DSFontes {
    static let familiasDaCasa = ["Spectral", "Inter", "Inter Tight", "Space Grotesk", "JetBrains Mono"]
    private(set) static var registradas: Set<String> = []

    /// web/fonts dentro do bundle: Contents/Resources/web/fonts no Mac, <app>/web/fonts no iPad.
    static func pastaDoApp() -> URL? {
        Bundle.main.resourceURL?.appendingPathComponent("web/fonts", isDirectory: true)
    }

    @discardableResult
    static func registrar(pasta: URL? = pastaDoApp()) -> Set<String> {
        guard let pasta,
              let itens = try? FileManager.default.contentsOfDirectory(at: pasta, includingPropertiesForKeys: nil)
        else { return registradas }
        for url in itens where url.pathExtension == "woff2" {
            var erro: Unmanaged<CFError>?
            let ok = CTFontManagerRegisterFontsForURL(url as CFURL, .process, &erro)
            let jaEstava = erro.map {
                CFErrorGetCode($0.takeRetainedValue()) == CTFontManagerError.alreadyRegistered.rawValue
            } ?? false
            guard ok || jaEstava else { continue }
            guard let descs = CTFontManagerCreateFontDescriptorsFromURL(url as CFURL) as? [CTFontDescriptor]
            else { continue }
            for d in descs {
                if let fam = CTFontDescriptorCopyAttribute(d, kCTFontFamilyNameAttribute) as? String {
                    registradas.insert(fam)
                }
            }
        }
        return registradas
    }

    static func disponivel(_ familia: String) -> Bool { registradas.contains(familia) }
}

/// Os quatro degraus da interface (spec §4.2). O tamanho de LEITURA é escolha da pessoa.
enum DSTipo: CGFloat { case micro = 12, corpo = 15, titulo = 19, display = 26 }

extension DS {
    /// Piso de 11 pt e, no iPad, Dynamic Type pela métrica do corpo. É aplicada UMA vez:
    /// as fontes abaixo usam `fixedSize`, para o SwiftUI não escalar de novo.
    static func escala(_ size: CGFloat) -> CGFloat {
        #if os(iOS)
        return UIFontMetrics(forTextStyle: .body).scaledValue(for: max(11, size))
        #else
        return max(11, size)
        #endif
    }

    /// Interface (rótulos, listas, botões): Inter.
    static func interface(_ size: CGFloat, _ peso: Font.Weight = .regular) -> Font {
        familia("Inter", size, peso, queda: .default)
    }
    /// Títulos e números grandes: a família de display da direção ativa.
    static func display(_ size: CGFloat, _ peso: Font.Weight = .bold) -> Font {
        familia(ThemeState.t.displayFamilia, size, peso,
                queda: ThemeState.t.displaySerif ? .serif : .default)
    }
    /// Só onde há medida: número de dispositivo, contagem, data.
    static func mono(_ size: CGFloat, _ peso: Font.Weight = .medium) -> Font {
        familia("JetBrains Mono", size, peso, queda: .monospaced)
    }
    static func tipo(_ t: DSTipo, _ peso: Font.Weight = .regular) -> Font {
        (t == .titulo || t == .display) ? display(t.rawValue, peso) : interface(t.rawValue, peso)
    }

    /// Primeira família de um valor CSS de `--display`, se for uma das da casa.
    static func familiaDisplay(css: String) -> String? {
        guard let primeira = css.split(separator: ",").first else { return nil }
        let nome = primeira.trimmingCharacters(in: CharacterSet(charactersIn: " '\""))
        return DSFontes.familiasDaCasa.contains(nome) ? nome : nil
    }

    private static func familia(_ nome: String, _ size: CGFloat, _ peso: Font.Weight,
                                queda: Font.Design) -> Font {
        let s = escala(size)
        guard DSFontes.disponivel(nome) else { return .system(size: s, weight: peso, design: queda) }
        return Font.custom(nome, fixedSize: s).weight(peso)
    }
}
```

- [ ] **Step 4: Criar `ios/vendor/design/Medidas.swift`**

```swift
import CoreGraphics

/// Escala de espaço da casa (DESIGN.md): grupo apertado, separação generosa.
enum DSEspaco {
    static let e1: CGFloat = 4, e2: CGFloat = 8, e3: CGFloat = 12, e4: CGFloat = 16
    static let e5: CGFloat = 24, e6: CGFloat = 32, e7: CGFloat = 48
}

/// Três raios, todos derivados do --radius da direção ativa — os MESMOS no LEGIS e no
/// JURIS (antes o JURIS usava −4/+4 e o LEGIS −3/+6).
enum DSRaio {
    static var card: CGFloat    { ThemeState.t.radius }
    static var interno: CGFloat { max(6, ThemeState.t.radius - 3) }
    static var hero: CGFloat    { ThemeState.t.radius + 6 }
}
```

- [ ] **Step 5: Rodar os testes e ver passar**

Run: `bash scripts/testar-design-nativo.sh`
Expected: todos `✓`. Se "fonte da casa registrada: X" falhar para uma família, rode `ls fonts` e confira o nome real da família no woff2 (`CTFontDescriptorCopyAttribute` com `kCTFontFamilyNameAttribute`). Ajuste `familiasDaCasa` para o nome que o CoreText devolve e informe a diferença no PR.

- [ ] **Step 6: Registrar as fontes no início dos dois apps**

`mac/Sources/main.swift`, primeira linha de `applicationDidFinishLaunching`:
```swift
        DSFontes.registrar()       // fontes da casa (web/fonts) para o LEGIS/JURIS nativos
```
`ios/Sources/main.swift`, primeira linha de `application(_:didFinishLaunchingWithOptions:)`:
```swift
        DSFontes.registrar()       // fontes da casa (web/fonts) para o LEGIS/JURIS nativos
```

- [ ] **Step 7: A ponte grava a família de display**

Nos dois `main.swift`, dentro de `if let disp = d["display"] as? String { … }` (Mac perto da linha 1485, iPad perto da 443), acrescente como última linha do bloco:
```swift
            if let fam = DS.familiaDisplay(css: disp) { t.displayFamilia = fam }
```

- [ ] **Step 8: Compilar os dois alvos (um de cada vez)**

```bash
bash mac/build-app.sh 2>&1 | grep -E "error:|✓" | tail -5
```
Depois:
```bash
bash ios/build-ipad.sh 2>&1 | grep -E "error:|✓" | tail -5
```
Expected: sem `error:`.

- [ ] **Step 9: Commit**

```bash
git add ios/vendor/design/Tipografia.swift ios/vendor/design/Medidas.swift tests/design-nativo/main.swift mac/Sources/main.swift ios/Sources/main.swift
git commit -m "O LEGIS e o JURIS nativos passam a ter as fontes da casa (Spectral, Inter, JetBrains Mono) e uma escala de texto única

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `AppTheme`, `Palette` e `Typo` passam a ler a base

**Files:**
- Modify: `{mac,ios}/vendor/legis/Theme.swift` (`enum AppTheme`)
- Modify: `{mac,ios}/vendor/juris/Design/JurisTheme.swift` (`Palette` semânticos e raios; `Typo`)

**Interfaces:**
- Consumes: `DS.escala/interface/display/mono`, `DSRaio` (Task 3)
- Produces: nenhuma API nova. As assinaturas de `AppTheme`, `Palette` e `Typo` ficam **iguais**, para que nenhuma tela precise mudar nesta entrega.

- [ ] **Step 1: `AppTheme` (LEGIS) nas duas árvores**

Em `mac/vendor/legis/Theme.swift` **e** `ios/vendor/legis/Theme.swift`, dentro de `enum AppTheme`:

```swift
    static var rCard: CGFloat  { DSRaio.card }
    static var rInner: CGFloat { DSRaio.interno }
    static var rHero: CGFloat  { DSRaio.hero }
```
(substituindo as três linhas `rCard`/`rInner`/`rHero` atuais) e

```swift
    /// Fonte de TÍTULO: a família de display da direção ativa (base visual comum).
    static func displayFont(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font {
        DS.display(size, weight)
    }
```
(substituindo o `displayFont` atual).

Só no iPad (`ios/vendor/legis/Theme.swift`), substitua `escala` e `ui` por:
```swift
    static func escala(_ size: CGFloat) -> CGFloat { DS.escala(size) }
    static func ui(_ size: CGFloat, _ weight: Font.Weight = .regular, design: Font.Design = .default) -> Font {
        switch design {
        case .default:    return DS.interface(size, weight)
        case .monospaced: return DS.mono(size, weight)
        default:          return .system(size: DS.escala(size), weight: weight, design: design)
        }
    }
```

- [ ] **Step 2: `Palette` e `Typo` (JURIS) nas duas árvores**

Em `mac/vendor/juris/Design/JurisTheme.swift` **e** `ios/vendor/juris/Design/JurisTheme.swift`:

```swift
    static var ok: Color   { ThemeState.t.ok }
    static var warn: Color { ThemeState.t.warn }
    static var bad: Color  { ThemeState.t.danger }
```
(substituindo as três linhas com `isDark ? Color(hex: …) : Color(hex: …)`. O `--ok`/`--warn`/`--danger` do host já vêm certos para o claro e para o escuro pela ponte.)

```swift
    static var rCard: CGFloat  { DSRaio.card }
    static var rInner: CGFloat { DSRaio.interno }
    static var rHero: CGFloat  { DSRaio.hero }
```

Em `enum Typo`, sem tocar em `readingFamily` nem no ramo `if let fam = readingFamily` de `serifTitle`/`serifBody` (a leitura é escolha da pessoa):

```swift
    static func serifTitle(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font {
        if let fam = readingFamily { return Font.custom(fam, size: max(11, size)).weight(weight) }
        return DS.display(size, weight)
    }
    static func ui(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        DS.interface(size, weight)
    }
    static func num(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font {
        DS.interface(size, weight).monospacedDigit()
    }
```
No iPad, `serifBody` e os demais usos de `escalado(_:)` passam a chamar `DS.escala(_:)`. Troque o corpo de `escalado` por `DS.escala(size)` em vez de apagá-lo, porque outras telas podem chamá-lo.

- [ ] **Step 3: Compilar os dois alvos (um de cada vez)**

```bash
bash mac/build-app.sh 2>&1 | grep -E "error:|✓" | tail -5
```
Depois:
```bash
bash ios/build-ipad.sh 2>&1 | grep -E "error:|✓" | tail -5
```
Expected: sem `error:`.

- [ ] **Step 4: Olhar a mudança de verdade (captura no simulador)**

```bash
xcrun simctl terminate booted com.catedra.ipad 2>/dev/null; xcrun simctl launch booted com.catedra.ipad -abaLegis
```
Espere cerca de 5 s e capture:
```bash
xcrun simctl io booted screenshot /private/tmp/claude-501/entrega1-legis.png
```
Repita com `-abaJuris` (arquivo `entrega1-juris.png`). **Abra as duas imagens.** Os títulos devem estar em Spectral e os rótulos que passam por `AppTheme.ui`/`Typo.ui` em Inter. Nada pode estar cortado nem sobreposto, e nenhum texto pode ter sumido. Se algum título quebrar feio por causa da métrica diferente da Spectral, anote a tela no PR. Não corrija nesta entrega: as telas mudam nas entregas 2 a 6.

- [ ] **Step 5: Commit**

```bash
git add mac/vendor/legis/Theme.swift ios/vendor/legis/Theme.swift mac/vendor/juris/Design/JurisTheme.swift ios/vendor/juris/Design/JurisTheme.swift
git commit -m "Títulos, rótulos, raios e cores de situação do LEGIS e do JURIS passam a vir da base visual comum

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Catraca de design nativo na suíte, no build e na CI

**Files:**
- Create: `scripts/verificar-design-nativo.mjs`
- Create: `scripts/design-nativo-base.json` (gerado)
- Create: `tests/design-nativo.mjs`
- Modify: `tests/run.mjs` (import perto da linha 51; bloco perto da 4191)
- Modify: `scripts/build-macos.mjs:25-27`
- Modify: `.github/workflows/testes.yml`

**Interfaces:**
- Produces: `export const PADROES`, `export const PERMITIDOS`, `export function contar(lado: 'mac'|'ios'): {cores, pretoBranco, tamanhos, emoji}`, `export function verificar(): {atual, base, falhas: string[]}`, `export async function testarDesignNativo(ok)`

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/design-nativo.mjs`:

```js
/* BASE VISUAL NATIVA (entrega 1 da reformulação LEGIS/JURIS, 25/09/2026)

   Prova duas coisas:
   · a catraca: fora de ios/vendor/design, o LEGIS e o JURIS nativos (Mac e iPad) não ganham
     nenhum hex, .white/.black literal, .system(size:) ou emoji novo — a contagem só desce
     (scripts/design-nativo-base.json);
   · no Mac, os testes Swift da base (cor, contraste, fontes, escala) passam
     (scripts/testar-design-nativo.sh). Fora do macOS (CI Ubuntu) essa parte é pulada.

   Roda sozinho: node tests/design-nativo.mjs */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function testarDesignNativo(ok) {
  const V = await import('../scripts/verificar-design-nativo.mjs');

  const amostra = 'Color(hex: 0x123456); Text("a").foregroundStyle(.white); .font(.system(size: 12))';
  ok((amostra.match(V.PADROES.cores) || []).length === 1
    && (amostra.match(V.PADROES.pretoBranco) || []).length === 1
    && (amostra.match(V.PADROES.tamanhos) || []).length === 1,
    'DN1 a catraca reconhece um hex, um .white e um tamanho fixo');
  ok(!('.whitespacesAndNewlines'.match(V.PADROES.pretoBranco)),
    'DN2 .whitespacesAndNewlines não conta como .white');

  const r = V.verificar();
  ok(r.falhas.length === 0,
    'DN3 nenhum hex, .white/.black, .system(size:) ou emoji novo fora da base visual (Mac e iPad)'
    + (r.falhas.length ? ' — ' + r.falhas.join('; ') : ''));

  if (process.platform !== 'darwin') {
    ok(true, 'DN4 testes Swift da base visual — pulados fora do macOS (no Mac: bash scripts/testar-design-nativo.sh)');
    return;
  }
  let saida = '', passou = true;
  try {
    saida = execFileSync('bash', [path.join(RAIZ, 'scripts', 'testar-design-nativo.sh')], { encoding: 'utf8' });
  } catch (e) {
    passou = false;
    saida = String(e.stdout || '') + String(e.stderr || '');
  }
  ok(passou, 'DN4 testes Swift da base visual (cor, contraste, fontes, escala) passam'
    + (passou ? '' : ' — ' + saida.split('\n').filter((l) => l.startsWith('✗') || /error:/.test(l)).join('; ').slice(0, 400)));
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const falhas = [];
  await testarDesignNativo((c, l) => { console.log((c ? '✓ ' : '✗ ') + l); if (!c) falhas.push(l); });
  process.exit(falhas.length ? 1 : 0);
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node tests/design-nativo.mjs`
Expected: FAIL com "Cannot find module '…/scripts/verificar-design-nativo.mjs'".

- [ ] **Step 3: Criar `scripts/verificar-design-nativo.mjs`**

```js
// scripts/verificar-design-nativo.mjs — catraca de design do LEGIS/JURIS nativos.
//
// POR QUE ISTO EXISTE: a reformulação de 25/09/2026 criou uma base visual única
// (ios/vendor/design). Fora dela, cada hex, .white/.black literal, .system(size:) e emoji
// usado como ícone é dívida a migrar (spec §9). Esta checagem CONTA essas ocorrências em
// {mac,ios}/vendor/{legis,juris} e FALHA se alguma contagem subir em relação à linha de base
// (scripts/design-nativo-base.json). A base só desce: `--atualizar` recusa gravar aumento.
//
//   node scripts/verificar-design-nativo.mjs              confere
//   node scripts/verificar-design-nativo.mjs --atualizar  grava a contagem atual (só se não subiu)
//   node scripts/verificar-design-nativo.mjs --criar      grava a primeira linha de base
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = join(ROOT, 'scripts', 'design-nativo-base.json');
const LADOS = ['mac', 'ios'];
const PASTAS = ['vendor/legis', 'vendor/juris'];

export const PADROES = {
  cores: /Color\(\s*(?:hex|red|white):|Color\(\s*\.sRGB|NSColor\(\s*(?:srgbRed|red|white|calibratedRed|deviceRed):|Color\.(?:red|blue|green|orange|yellow|purple|pink|gray|grey|indigo|teal|mint|cyan|brown)\b/g,
  pretoBranco: /\.(?:white|black)\b/g,
  tamanhos: /\.system\(\s*size:/g,
  emoji: /\p{Extended_Pictographic}/gu,
};

// Emoji que é DADO, não ícone — com o motivo. Qualquer outro emoji conta.
export const PERMITIDOS = [
  { arquivo: 'vendor/juris/Views/EntryDetailView.swift', trecho: /\("(?:Ícones de estudo|Jurídicos|Setas|Marcadores)"/,
    motivo: 'paleta de símbolos que a pessoa insere no texto da própria nota' },
  { arquivo: 'vendor/legis/RichNoteEditor.swift', trecho: /^\s*\("(?:❓|❗|💡|🚩)"|allTags/,
    motivo: 'etiquetas já gravadas nas notas — trocar apagaria o significado do que está salvo' },
  { arquivo: 'vendor/juris/Store/Exporter.swift', trecho: /Inverte o operador/,
    motivo: 'setas (↔) dentro de um texto explicativo' },
];

const semComentario = (linha) => linha.replace(/(^|\s)\/\/.*$/, '$1');

function arquivosSwift(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? arquivosSwift(p) : e.name.endsWith('.swift') ? [p] : [];
  });
}

export function contar(lado) {
  const tot = { cores: 0, pretoBranco: 0, tamanhos: 0, emoji: 0 };
  for (const pasta of PASTAS) {
    for (const f of arquivosSwift(join(ROOT, lado, pasta))) {
      const rel = relative(join(ROOT, lado), f).split('\\').join('/');
      for (const linha of readFileSync(f, 'utf8').split('\n')) {
        const cod = semComentario(linha);
        for (const k of ['cores', 'pretoBranco', 'tamanhos']) tot[k] += (cod.match(PADROES[k]) || []).length;
        const em = cod.match(PADROES.emoji) || [];
        if (em.length && !PERMITIDOS.some((a) => a.arquivo === rel && a.trecho.test(cod))) tot.emoji += em.length;
      }
    }
  }
  return tot;
}

export function verificar() {
  const atual = Object.fromEntries(LADOS.map((l) => [l, contar(l)]));
  if (!existsSync(BASE)) return { atual, base: null, falhas: ['sem linha de base — rode com --criar'] };
  const base = JSON.parse(readFileSync(BASE, 'utf8'));
  const falhas = [];
  for (const lado of LADOS) {
    for (const [k, v] of Object.entries(atual[lado])) {
      const b = base[lado]?.[k];
      if (b === undefined) falhas.push(`${lado}.${k}: sem linha de base`);
      else if (v > b) falhas.push(`${lado}.${k}: ${v} (a base é ${b} — migre para ios/vendor/design em vez de somar)`);
    }
  }
  return { atual, base, falhas };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const criar = process.argv.includes('--criar');
  const atualizar = process.argv.includes('--atualizar');
  const r = verificar();
  if (criar) {
    if (r.base) { console.error('✗ a linha de base já existe — use --atualizar'); process.exit(1); }
    writeFileSync(BASE, JSON.stringify(r.atual, null, 2) + '\n');
    console.log('✓ linha de base criada:', JSON.stringify(r.atual));
  } else if (r.falhas.length) {
    console.error('\n✗ BUILD ABORTADO — a dívida visual do LEGIS/JURIS nativos subiu:\n  ' + r.falhas.join('\n  ') + '\n');
    process.exit(1);
  } else if (atualizar) {
    writeFileSync(BASE, JSON.stringify(r.atual, null, 2) + '\n');
    console.log('✓ linha de base rebaixada:', JSON.stringify(r.atual));
  } else {
    console.log('  ✓ design nativo: nenhuma dívida visual nova —', LADOS.map((l) => `${l} ${JSON.stringify(r.atual[l])}`).join(' · '));
  }
}
```

A condição de "rodando sozinho" compara caminhos absolutos (`resolve`), então funciona tanto com `node scripts/…` quanto com o caminho completo. Quando o script é **importado** (pelo build e pela suíte), nada é gravado nem impresso.

- [ ] **Step 4: Criar a linha de base e ver o teste passar**

```bash
node scripts/verificar-design-nativo.mjs --criar
node tests/design-nativo.mjs
```
Expected: `✓ linha de base criada: {...}`; depois DN1–DN4 com `✓`.

Controle: acrescente temporariamente `let _x = Color(hex: 0x123456)` numa linha de `mac/vendor/legis/ContentView.swift` e rode `node scripts/verificar-design-nativo.mjs`. O esperado é `✗ … mac.cores: N+1 (a base é N …)`. Desfaça.

- [ ] **Step 5: Ligar ao build, à suíte e à CI**

`scripts/build-macos.mjs`, junto dos outros imports de trava (linhas 25–27):
```js
import { verificar as verificarDesignNativo } from './verificar-design-nativo.mjs';   // trava: dívida visual do nativo só desce
{ const r = verificarDesignNativo(); if (r.falhas.length) throw new Error('\n✗ BUILD ABORTADO — dívida visual do LEGIS/JURIS nativos subiu:\n  ' + r.falhas.join('\n  ')); }
```

`tests/run.mjs`, junto do import de `testarXcodeCloud` (perto da linha 51):
```js
import { testarDesignNativo } from './design-nativo.mjs';
```
e logo depois do bloco `try { await testarXcodeCloud(ok); } catch …` (perto da linha 4191):
```js
/* ============= BASE VISUAL NATIVA (LEGIS/JURIS) =============
   Catraca de hex/tamanho fixo/emoji fora de ios/vendor/design e, no Mac, os testes Swift
   da base. Roteiro em tests/design-nativo.mjs (a catraca roda também na CI). */
try { await testarDesignNativo(ok); }
catch (e) {
  ok(false, 'DESIGN NATIVO o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}
```

`.github/workflows/testes.yml`, no job `testes`, logo depois do passo "Nenhuma chave de API no repositório":
```yaml
      - name: Dívida visual do LEGIS/JURIS nativos só desce
        run: node scripts/verificar-design-nativo.mjs
```

- [ ] **Step 6: Conferir o build web**

Run: `node scripts/build-macos.mjs 2>&1 | grep -E "✗|design nativo|paleta" | head`
Expected: nenhum `✗`. (O `build-macos.mjs` passou a importar a catraca.)

- [ ] **Step 7: Commit**

```bash
git add scripts/verificar-design-nativo.mjs scripts/design-nativo-base.json tests/design-nativo.mjs tests/run.mjs scripts/build-macos.mjs .github/workflows/testes.yml
git commit -m "Uma catraca impede que o LEGIS e o JURIS nativos voltem a ganhar cor fixa, tamanho de fonte solto ou emoji fora da base visual

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Nenhum emoji como ícone

**Files (nas DUAS árvores, `mac/` e `ios/`):**
- Modify: `vendor/legis/ChecklistView.swift` (frase "Tudo em dia…")
- Modify: `vendor/juris/Views/JurisChecklistView.swift` (a mesma frase)
- Modify: `vendor/legis/DashboardView.swift` (`heroStat("🔥 …")`)
- Modify: `vendor/legis/PlanoLeituraView.swift` ("Plano concluído" e "⏰ … atrasada")
- Modify: `vendor/legis/SRSReviewView.swift` ("Revisão concluída")
- Modify: `vendor/juris/Views/SimuladoView.swift` ("⏱ …")
- Modify: `scripts/verificar-design-nativo.mjs` (emoji passa a ser zero obrigatório)
- Modify: `scripts/design-nativo-base.json` (rebaixada)
- Test: `tests/design-nativo.mjs`

- [ ] **Step 1: Escrever o teste que falha**

Em `tests/design-nativo.mjs`, logo depois do `ok(… 'DN3 …')`:
```js
  ok(r.atual.mac.emoji === 0 && r.atual.ios.emoji === 0,
    'DN5 nenhum emoji usado como ícone no LEGIS/JURIS nativos (Mac '
    + r.atual.mac.emoji + ', iPad ' + r.atual.ios.emoji + ')');
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node tests/design-nativo.mjs`
Expected: `✗ DN5 … (Mac 7, iPad 7)`

- [ ] **Step 3: Tirar os emojis (nas duas árvores)**

Localize cada um com `grep -n` no arquivo do lado correspondente. As linhas diferem entre Mac e iPad, mas o texto é o mesmo:

| Antes | Depois |
|---|---|
| `"Tudo em dia por aqui — nenhuma meta pendente. 🎉"` (ChecklistView e JurisChecklistView) | `"Tudo em dia por aqui — nenhuma meta pendente."` |
| `if !ThemeState.t.baixaEstimulacao { heroStat("🔥 \(store.currentStreak)d", "sequência") }` | `if !ThemeState.t.baixaEstimulacao { heroStat("\(store.currentStreak)d", "sequência") }` |
| `Text(ThemeState.t.baixaEstimulacao ? "Plano concluído — parabéns!" : "Plano concluído — parabéns! 🎉")` | `Text("Plano concluído — parabéns!")` |
| `Text(atr > 0 ? "⏰ \(atr) leitura…` | `Text(atr > 0 ? "\(atr) leitura…` (só some o `⏰ `) |
| `allDone(title: ThemeState.t.baixaEstimulacao ? "Revisão concluída" : "Revisão concluída 🎉",` | `allDone(title: "Revisão concluída",` |
| `EtiquetaEstudo(texto: "⏱ \(SimuladoLocal.tempo(p.segundos))", …` | `EtiquetaEstudo(texto: "Tempo \(SimuladoLocal.tempo(p.segundos))", …` |

- [ ] **Step 4: Emoji vira zero obrigatório e a base desce**

Em `scripts/verificar-design-nativo.mjs`, dentro de `verificar()`, logo antes do `return { atual, base, falhas };`:
```js
  for (const lado of LADOS) if (atual[lado].emoji > 0)
    falhas.push(`${lado}.emoji: ${atual[lado].emoji} — emoji não é ícone (DESIGN.md); use SF Symbol ou texto`);
```
Depois:
```bash
node scripts/verificar-design-nativo.mjs --atualizar
node tests/design-nativo.mjs
```
Expected: `✓ linha de base rebaixada: …"emoji": 0…` e DN1–DN5 com `✓`.

- [ ] **Step 5: Compilar os dois alvos (um de cada vez)**

```bash
bash mac/build-app.sh 2>&1 | grep -E "error:|✓" | tail -5
```
Depois:
```bash
bash ios/build-ipad.sh 2>&1 | grep -E "error:|✓" | tail -5
```
Expected: sem `error:`.

- [ ] **Step 6: Commit**

```bash
git add mac/vendor ios/vendor scripts/verificar-design-nativo.mjs scripts/design-nativo-base.json tests/design-nativo.mjs
git commit -m "O LEGIS e o JURIS nativos deixam de usar emoji como ícone

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Suíte completa, instalação nos dois aparelhos e PR

**Files:** nenhum código novo.

- [ ] **Step 1: Suíte web e WebKit**

A suíte agora inclui o módulo `design-nativo`. Rode as duas, uma depois da outra:

```bash
CT_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test 2>&1 | tail -15
```
```bash
npm run test:webkit 2>&1 | tail -10
```
Expected: as duas verdes, com as linhas DN1–DN5 `✓` na primeira. Se falhar algo **fora** de DN, confira em `main` (`git stash` NÃO: use outro worktree) se a falha já existia antes. Se já existia, informe; se não, corrija.

- [ ] **Step 2: Instalar no Mac**

Feche o Cátedra antes. Depois:
```bash
bash mac/build-app.sh && ditto --norsrc --noextattr --noacl "mac/build/Cátedra.app" "/Applications/Cátedra.app"
```
Expected: o build termina e o app abre em `/Applications`.

- [ ] **Step 3: Capturas no simulador — claro, escuro e texto grande**

```bash
bash ios/build-ipad.sh
for aba in -abaLegis -abaJuris; do
  xcrun simctl terminate booted com.catedra.ipad 2>/dev/null
  xcrun simctl launch booted com.catedra.ipad $aba; sleep 6
  xcrun simctl io booted screenshot "/private/tmp/claude-501/entrega1${aba}.png"
done
xcrun simctl ui booted content_size extra-extra-large
xcrun simctl terminate booted com.catedra.ipad; xcrun simctl launch booted com.catedra.ipad -abaLegis; sleep 6
xcrun simctl io booted screenshot /private/tmp/claude-501/entrega1-texto-grande.png
xcrun simctl ui booted content_size large
```
Para o escuro e para uma direção não serifada: abra os Ajustes do Cátedra no simulador (ferramenta do Simulador), escolha **Terminal** no modo escuro, volte ao LEGIS e capture `entrega1-terminal-escuro.png`. Depois volte para **Planilha** no modo claro.

**Abra todas as capturas** e confira:
- títulos em Spectral (Planilha) e em JetBrains Mono (Terminal);
- nenhum texto sumido ou cortado;
- no texto grande, nada sobreposto.

- [ ] **Step 4: Instalar no iPad da dona**

```bash
xcrun devicectl list devices | grep -i "iPad de Lana"
bash ios/build-ipad.sh device
xcrun devicectl device install app --device <UDID-da-linha-acima> "ios/build/Cátedra.app"
```
Erro 4016 = iPad bloqueado ou fora da rede. Tente de novo quando ele voltar; não é defeito do build.

- [ ] **Step 5: Push e PR**

```bash
git push -u origin redesenho-nativo-1-base
gh pr create --title "LEGIS e JURIS nativos ganham uma base visual única (entrega 1 da reformulação)" --body "$(cat <<'EOF'
## O que muda para a pessoa
- Títulos e rótulos do LEGIS e do JURIS no Mac e no iPad passam a usar as fontes da casa (Spectral, Inter, JetBrains Mono) e seguem a direção visual escolhida.
- Cores de ramo e de tribunal vêm de uma tabela só, com cor de texto legível no claro e no escuro.
- Emoji deixa de ser usado como ícone.

## Por dentro
- `ios/vendor/design/` (Tema, Cor, CoresAcervo, Tipografia, Medidas), compilada pelo Mac, pelo iPad e pelo Xcode Cloud.
- `AppTheme`, `Palette`, `Typo`, `RamoStyle` e `LawCategory.color` viram apelidos da base — nenhuma tela precisou mudar.
- Catraca `scripts/verificar-design-nativo.mjs` (CI + build): hex, `.white/.black`, `.system(size:)` e emoji fora da base só descem.
- Especificação e plano em `docs/superpowers/`.

## Testes novos
- `tests/design-nativo.mjs` (DN1–DN5), ligado à suíte; testes Swift da base em `tests/design-nativo/main.swift` (`bash scripts/testar-design-nativo.sh`).

## Capturas
(anexar as de /private/tmp/claude-501/entrega1*.png)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: Relatório final (CLAUDE.md, item 5)**

Liste para a dona:
- arquivos alterados;
- casos de teste novos (DN1–DN5 e as conferências Swift);
- o que ficou pendente (telas com título quebrado anotadas no Step 4 da Task 4, se houver);
- o que ela precisa decidir. Nesta entrega, nada; a próxima é a entrega 2, o leitor do LEGIS, que recebe plano próprio.
