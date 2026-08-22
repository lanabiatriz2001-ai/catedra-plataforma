# Pente fino — 21/08/2026

Quatro auditorias somente-leitura (Cátedra web ×2, LEGIS, JURIS) consolidadas num plano de execução.
Os relatórios completos com linha a linha ficam no histórico da sessão; aqui está o que vira código, na ordem.

## Build B — Cátedra web (bugs + menu + Ajustes)

### Bugs corrigidos
| # | Onde | Problema | Correção |
|---|---|---|---|
| B1 | Edital KPI | "Disciplinas em dia" dividia por nº de tópicos (2/143) | denominador = `edital.length` |
| B2 | Revisões | revisão nascia vencendo no mesmo dia (`due:0`) | SM-2 começa em D+1 |
| B3 | Metas | "Estudar 20 horas" virava 20 minutos | alvo ×60 quando o título diz hora |
| B4 | Conquistas | "Em progresso" esvaziava após o 1º nível | progresso = `!done` |
| B5 | Início | tile "Tempo hoje" somava cronômetro de ontem | guarda `_cronoHoje` |
| B6 | Início | "5 para hoje" escondia 4 vencidas | "4 vencidas · 1 hoje" |
| B7 | Simulado | `encerrarSj` gravava `simAnalysis:'obj'` (inexistente) → Raio-X caía no bruto | `'liquida'` |
| B8 | Prova oral | `_registrarAtividadeAuto` não existia → arguição nunca contava como estudo | registra sessão real |
| B9 | Simulado | input anunciava 10–120, handler travava 5–100 | limites alinhados (10–120) |
| B10 | Menu | LEGIS/JURIS/Roteiros/Prioridade/2ª fase fora de `_moreViews` → nada ativo no menu | lista única |
| B11 | Redação | "648 provas" fixo no texto; toast "cole em ③" (passo extinto) | `{{ bancoTotal }}`; copy certo |
| B12 | Menu | selos "NOVO" eternos | some após 1ª visita |
| B13 | Títulos | subtítulos defasados de Redação e Simulados | atualizados |
| B14 | Faixas de cor | 4 limiares diferentes para a mesma métrica (≥70/50, 70/55, 80/60) | `LIQ_OK=70, LIQ_WARN=55` |
| B15 | Ciclo | cabeçalho fixo "MAGISTRATURA ESTADUAL" | segue objetivo/área |

### Menu lateral (reorganizado por rotina diária)
```
HOJE     Início · Ciclo · Revisões (badge) · Calendário
TREINO   Simulados · Redação (2ª fase) · Prova oral · Roteiros e peças · Prioridade
ACERVO   CátedraLEGIS · CátedraJURIS · Processo · Edital · Bancas
MAIS     Desempenho · Metas · Histórico · Comunidade · Bem-estar · Ajustes
```
Racional: ver o dia → revisar → treinar (o que gera nota) → consultar. O que era "Sistema" (rótulo que não descrevia nada) sobe para Treino/Acervo.

### Ajustes (v3)
- Card "Ajustes de foco" (automação) entra na aba **Estudo** (o texto já prometia isso).
- Backup / exportar / importar / apagar tudo entram na aba **Dados** (estavam soltos fora das abas).
- Bloco "Ajustes avançados do Anki" renomeado para **Flashcards** (a view Anki não existe mais).
- Aba "Método da banca" vira link para a view Bancas (banca em um lugar só).

## Build C — LEGIS + JURIS (Swift, Mac e iPad)

### LEGIS (25 achados) — ordem de unificação
1. `AppTheme`: `rCard/rInner/rHero`, `Typo.num`; matar hex e raios literais.
2. Telas inalcançáveis pela sidebar entram no menu; prova do Simulado não some em 1 clique.
3. Um só `SectionShell` para todas as páginas; `displayFont` (serifa) realmente usado nos títulos.
4. Um card, um chip (hoje 6 receitas de card e 5 de chip).

### JURIS (38 achados) — ordem de unificação
1. `Palette.ok/bad/rCard/rInner/rHero` + `Typo.num`; ~40 hex/raios literais (achados 2, 24–28).
2. Mover componentes soltos para `Components.swift`; `JurisChip(ativo:)` e `SecaoTitulo` únicos; apagar `SectionRule` e `TopBar.swift` (morto).
3. `SectionShell` em Simulado, Oral·bancas, Grade, Julgado do dia, Prova oral, TJROHub, Plano, Mapas, Checklist, Coleção, Novidades.
4. `CartaoJuris(style:)` substituindo 5 variantes; lombada sempre = ramo.
5. `store.ir(_:)` único; Home em 4 blocos (Hoje / Treinar / Acompanhar / Acervo).
6. Bugs: cronômetro que vaza (Timer → `onReceive`), filtros/anotações da Oral que somem ao trocar de aba, `prefix(18)` escondendo disciplinas, `persist()` sem debounce.
7. Sidebar: HOJE · TREINAR · ACERVO · MEU ESTUDO (mesma lógica do Cátedra).

## Áreas de estudo (conteúdo)
- `leis-seca-areas.js`: 35 leis do catálogo oficial, 3.776 artigos, etiquetadas por área (saúde, social, policial, fiscal, contas, administrativa, educação, tecnologia). Entram no Simulado (itens de lei seca) e na Prova oral (modo Lei seca) quando a área escolhida não é a jurídica.
- Lacunas do catálogo (sem fonte oficial no LEGIS ainda): Estatuto dos Militares, Lei Orgânica do TCU, leis orgânicas dos TCEs.

## iPad
- Ícone: `build-ipad.sh` passa a gerar os PNGs (mesmo renderizador do Mac) e a declarar `CFBundleIcons`.

## Publicação
- 21/08/2026 — Build B2 (correção da barra lateral + merge do PR #5) publicado no GitHub; commit assinado pelo GitHub para o deploy da Vercel.
- 22/08/2026 — Login v2 (auth.js) + backup na nuvem pessoal (iCloud Drive no Mac/iPad, Google Drive na web com GOOGLE_CLIENT_ID). Build C (JURIS) pronto no worktree; LEGIS em andamento.
