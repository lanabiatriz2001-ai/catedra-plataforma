# Handoff — Área de estudo como eixo do app (Ajustes + Início)

Referência de implementação do redesign de agosto/2026 (commits `d46da36` → `0a075f2`
em [Catedra.dc.html](../Catedra.dc.html)). Público: quem for portar o padrão para os
apps nativos (LEGIS/JURIS em Swift), criar uma área nova ou evoluir os Ajustes.

## Visão geral

A área de estudo escolhida deixou de ser uma preferência escondida e virou o eixo
visível do app: um hero nos Ajustes com a identidade da área e, logo abaixo e no
Início, **o essencial da área** — as 5 ferramentas fundamentais daquela área, cada
uma com o porquê, navegando direto. O seletor de 11 áreas fica recolhido atrás de
"Trocar de área".

## Modelo de dados

Cada entrada de `CT_AREAS` (módulo-escopo em Catedra.dc.html) ganhou:

```js
essenciais: [{ v:'legis', i:'⚖️', t:'Lei seca', d:'CátedraLEGIS já aberto na legislação da área' }, …]
// v = data-view do menu (legis, juris, redacao, oral, areamod, simulados, ciclo,
//     edital, revisoes, analise, calendario)
// i = emoji · t = título curto · d = por que é essencial (uma linha)
```

Regras de conteúdo: exatamente 5 itens por área; `t` com no máximo 3 palavras;
`d` é a razão, não a descrição da ferramenta. Toda área (inclusive `outra`) tem
essenciais — a UI não precisa tratar lista vazia, mas o gate `temEssenciais` existe.

## Tokens usados

| Token | Valor | Uso |
|---|---|---|
| `--heroGrad` | por tema | fundo do hero da área |
| `--radius` | por tema (4–22px conforme preferência) | cards essenciais |
| `--r-sm` | `clamp(5, radius×0,55, 9)px` — derivado em JS no rootStyle | controles pequenos |
| `--r-md` | `clamp(8, radius×0,8, 13)px` — idem | inputs e chips |
| `--accent` | por tema | faixa superior do card essencial, anel de foco |
| `--ok` / `--warn` / `--danger` | claro `#0e7f58` / `#a36306` / `#c0392f` · escuro `#3ddba0` / `#f0a24a` / `#ff7b6e` | semânticos; os claros foram calibrados para ≥4,5:1 como texto |
| `CT_CORES_RAMO` | mapa único `{c: claro, d: escuro}` por ramo | cor de matéria em gráficos e badges; `_corDisc()` prioriza a cor custom do edital e cai aqui |

Nunca introduzir hex de matéria fora de `CT_CORES_RAMO`; nunca usar `--ok/--warn/--danger`
hardcoded (a auditoria de 20/08/2026 removeu 221 ocorrências).

## Componentes

### Hero da área (Ajustes)
- Container: `background:var(--heroGrad); color:#fff; padding:26px 26px 22px`.
- Kicker "ÁREA DE ESTUDO": 10,5px, uppercase, letter-spacing .14em, opacity .75.
- Nome da área: `h2`, `var(--display)`, 30px, peso 700 — é heading real, não div.
- Botão "Trocar de área": pill, `rgba(255,255,255,.14)` de fundo e borda
  `rgba(255,255,255,.55)` (≥3:1 sobre o gradiente), padding 11px 20px.

### Card essencial
- Layout: `flex:1 1 180px; min-width:170px` num container `flex-wrap` com gap 10px —
  em linha cheia cabem 4-5; o último estica e nunca sobra card órfão estreito.
- Visual: `border:1px solid var(--border)` + `border-top:3px solid var(--accent)`
  (classe `.aj-ess`), `border-radius:var(--radius)`, padding 14px 15px.
- Conteúdo: título 13,5px/800 com emoji; razão 11,5px `var(--text3)`. Sem CTA
  textual — o card inteiro é o alvo.
- Hover: borda vira `var(--accent)`, `translateY(-1px)`, sombra `0 6px 18px rgba(0,0,0,.10)`,
  transição 150ms (`.aj-ess:hover`).
- Ação: `data-view` + `onNav` (o mesmo handler do menu).

### Chips de seção (Ajustes)
- Ghost: fundo transparente, borda `var(--border)`, texto `var(--text3)` 12px/600,
  padding 10px 16px. Rolam até âncoras `id="aj-*"` via `ajIr`.
- Motion: `scrollIntoView` suave, degradando para `auto` sob
  `prefers-reduced-motion: reduce`.

### Faixa "essencial da área" (Início)
- Fica DEPOIS do bloco `.cth-kpis` (os KPIs sobrepõem o hero com margem negativa —
  qualquer coisa entre hero e KPIs é encoberta; foi o primeiro bug do layout).
- Pills: mesmas 5 entradas, padding 11px 18px (~42px de alvo), `title` com a razão.

## Estados

| Elemento | Estado | Comportamento |
|---|---|---|
| Seletor de áreas | sem área escolhida | aberto à força (`areaSelOpen || !areaEstudo`) |
| Seletor de áreas | área escolhida | recolhido; abre por "Trocar de área", fecha ao escolher (inclusive a mesma) |
| Card essencial | hover | elevação + borda accent |
| Qualquer botão/input | foco por teclado | anel global `:focus-visible` 2px `var(--accent)` com `!important` (vence os `outline:none` inline) |
| Troca de área | efeito | `setAreaEstudo` também corrige view presa (JURIS fora de área jurídica), modelo de edital e rascunhos com disciplina de catálogo da área anterior — não mexer nessa cadeia sem ler o handler |

## Casos de borda

- **Trocar de área não apaga nada** — edital, histórico e revisões ficam; o texto
  que promete isso está no seletor aberto.
- **View essencial inexistente**: `v` precisa ser um `data-view` real do menu; um
  id errado navega para lugar nenhum silenciosamente. Conferir contra a lista em
  `viewTitle` ao adicionar área.
- **Título longo** (`SUAS e política social`): o card cresce em altura; não truncar.

## Acessibilidade (estado atual)

- Headings: `h1` da view + `h2` no nome da área e nas 6 seções (`aj-perfil`,
  `aj-banca`, `aj-ritmo`, `aj-metas`, `aj-plan`, `aj-conselho`).
- 22 pares `label[for]`/`id` (`aj-f-*`) nos formulários dos Ajustes.
- Contraste AA verificado nas duas paletas (cálculo em 20/08/2026); os únicos
  valores que reprovavam foram corrigidos em `c1d077c`.
- Pendências conhecidas: chips de seção com ~37px de alvo (mínimo AA ok, ideal 44);
  selects ainda sem `aria-label` reserva.

## Porte para o nativo

Os apps Mac/iPad carregam este mesmo bundle web — herdam tudo sem trabalho. Se o
padrão for replicado em telas Swift (LEGIS/JURIS), mapear: `--heroGrad` → gradiente
do tema em `JurisTheme/Theme.swift`; card essencial → o componente de card com
`accentColor` na borda superior; `CT_CORES_RAMO` → dicionário equivalente único
(hoje as views Swift têm cores próprias por seção — unificar na mesma passada).
