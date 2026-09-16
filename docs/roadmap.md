# Roadmap — Cátedra
*Criado em 21/08/2026, a partir do estado real (sessão de 20-21/08 + planos registrados). Atualizar quando algo mudar de coluna, não a cada detalhe.*

## Agora (em execução)

| Item | Status | Nota |
|---|---|---|
| Ciclo final de build Mac + iPad (tudo da sessão: design system 3 eixos, Ajustes reformulados, a11y, Simulado A-E, ritual) | **On Track** | rodando em fila; instala nos 2 aparelhos |
| Treino de sentença cível TJ-GO (58º) — escrever e entregar para correção pelo espelho oficial | **Not Started** (da Lana) | prova entregue, espelho guardado; brainstorm pausado no Ponto 3 |
| Primeiro simulado do ritual semanal | **Not Started** (da Lana) | chip no Início cutuca a partir de 7 dias |

## Próximo (1–4 semanas)

| Item | Gatilho/dependência | Nota |
|---|---|---|
| Rebuscar espelho TRF2 XIX Concurso | página oficial já tem seção "Espelho de Correção — Em breve" | maior chance de espelho novo público; provas de 08-09/08/2026 |
| Rebuscar espelhos das sentenças TJ-RJ LI (VUNESP) | correção em andamento (Edital 28-2026, desidentificação) | a discursiva já entrou no banco (20 quesitos) |
| Ampliar `questoes-prova.js` (83 → +VUNESP TJ-SP/TJ-RJ, FGV/CEBRASPE 2024-26) | sessões TEC **espaçadas** — anti-bot apareceu em 21/08, uma prova por vez | pipeline pronto (`build-questoes-prova.mjs`) |
| Bloco de Penal + Processo Penal no ciclo | métrica de 21/08: 3% e ~0% do tempo em 30d | gancho: sentença criminal TJ-GO |
| Decidir: import do desempenho TEC (`tec-desempenho`) | decisão da Lana — em aberto, não aprovado | fecharia o retrovisor do histórico de questões |
| ~~A11y restantes: `aria-label` nos selects, chips a 44px~~ | **PR #97, 16/09/2026** (riscar de vez no merge) | o host já estava coberto (`run.mjs` varre os selects de 21 telas). O que faltava era **nos satélites**, e maior do que a linha dizia: o alvo de 44px morava em `@media (max-width:640px)` e nunca alcançava o iPad — 1307 controles abaixo de 44 a 1024px contra 0 a 390px, mesmo ponteiro. Ver `tests/ipad-toque-satelites.mjs`. |
| ~~Separar cor-identidade de cor-texto nos consumidores textuais de `_corDisc`~~ | **já estava feito** (conferido em 16/09/2026) | o paliativo `color-mix(… 75%, black)` não existe mais: `_corTx()` escurece (clareia no escuro) em passos de 3% até MEDIR 4,5:1. Medido: 0 textos com cor-identidade crua abaixo de 4,5:1 em 21 telas × 2 modos. `scripts/verificar-cores-texto.mjs` ABORTA o build se alguma das 26 famílias falhar, e a suíte cobre com `corTextoLegivelNosDoisModos`. |

## Depois (1–3 meses)

- **Fazer questões dentro do Cátedra** — meta da direção 3 aprovada: banco interno grande o bastante para o treino diário (o TEC vira fonte, não destino).
- **Tokens do design system nos iframes** (legis-web, juris-web, ritos-web, pecas-web) — via cópia de tokens do host (mecanismo do checklist de lei seca); CSS vars não cruzam iframe.
- **Estados disabled/loading padronizados** nos botões (nota 5/10 no audit de componentes).
- **Porte do padrão hero/essenciais para as telas nativas Swift** — mapa em [handoff-area-estudo.md](handoff-area-estudo.md).
- **Espelho TJ-CE 2025** — só se o CNJ liberar o certame (suspenso, PCA 0003296-49.2026) E a FGV abrir o espelho (hoje é vista individual).

## Riscos e dependências externas

1. **Publicação de espelhos pelas bancas** — tendência 2026 é vista individual (TJ-MS, TJ-PR, TJ-CE, TRF6): cada espelho público é raro; coletar assim que sair.
2. **Anti-bot do TEC** — limita a velocidade de ampliação do banco; nunca contornar, sempre espaçar.
3. **Capacidade** — o gargalo é o tempo da Lana para os itens "da Lana" (treino, simulado, decisões); os itens técnicos não competem com ele.

## Fora de escopo (decidido, com razão)

- Medir desempenho por proxy em vez de questões (descartado no brainstorm de 21/08: questões são o que a prova mede).
- Competir com TEC em volume de objetivas (brief competitivo de 21/08: complementar, não substituir).
