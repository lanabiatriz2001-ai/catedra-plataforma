# Ajustes · Ritmo e metas — redesenho e ajustes que mudam o app

Data: 03/10/2026 · Dona: Lana · Branch: `ajustes-ritmo-metas`

## Objetivo

Refazer a aba "Ritmo e metas" de Ajustes para que ela personalize o uso da plataforma:
a pessoa escolhe um jeito de estudar, vê na hora o dia que esses ajustes produzem, e
**todo ajuste da aba muda algo de verdade no app**. Decisões da dona nesta conversa:

1. Conceito: perfis prontos + ajuste fino, com prévia ao vivo fixa.
2. Valores dos perfis aprovados (tabela abaixo).
3. Os ajustes que hoje são só enfeite não saem: passam a influenciar o comportamento.

## Diagnóstico do que existe

- ~33 ajustes em 8 cartões iguais, agrupados por onde o dado mora.
- Sem efeito hoje: `nivel`, `tempoDia`, `energia` (só serve de reserva de `energiaPlano`),
  `estrategia` (só vira rótulo). `cobranca` troca um verbo e o limiar do dia cumprido
  (50/85/100 %), mas a tela não conta isso a ninguém.
- "Quanto estudo" aparece três vezes: tempo médio por dia, meta mín./ideal/forte e o
  cartão "Meta diária de estudo" (régua de 1–10 h que espelha a meta ideal).
- A prévia "Como está ficando" some ao rolar.

## Entrega em dois PRs

- **PR 1 — tela nova**: layout, perfis, régua única, prévia fixa, fusão do tempo/meta,
  energia base × energia de hoje, cobrança visível.
- **PR 2 — ciclo**: nível e estratégia mudando o gerador de volta e os extras do dia.

Cada PR tem casos novos em `tests/`, passa em Chromium e WebKit e termina instalado no
Mac e no iPad (pela sessão instaladora, conforme a regra de 02/10).

## PR 1 — a tela

### Layout

- Largura útil ≥ 1100 px: duas colunas. Esquerda, as decisões; direita, a prévia
  "Seu dia com estes ajustes" com `position: sticky` no topo da área de rolagem.
- Abaixo disso (iPad em pé, iPhone): uma coluna; a prévia vira faixa compacta presa no
  topo (total × meta, barra do dia, veredito), que abre a lista de blocos ao toque.
- Direção vitrine: prévia em painel de destaque (gradiente do tema, número grande em
  `--display`), barra do dia segmentada com a cor de cada matéria, cartões de perfil
  grandes com ícone Lucide. Tokens sempre; sem faixa lateral; alvos ≥ 44 px no toque;
  `prefers-reduced-motion` respeitado; classes novas `ct-rm-*` em `catedra-ui.css`.

### Blocos, na ordem

1. **Seu jeito de estudar** — três cartões. Um toque aplica o perfil e mostra um aviso
   com "Desfazer" (restaura os valores anteriores). O perfil em uso é **deduzido**: o
   cartão fica marcado quando os valores batem com a tabela; se algum diverge, aparece o
   rótulo "Personalizado". Nenhuma chave nova de estado.

   | Perfil | metaMin | metaIdeal | metaForte | blocoPadrao | cobranca |
   |---|---|---|---|---|---|
   | Constância | 60 | 120 | 180 | 40 | leve |
   | Equilíbrio (fábrica) | 60 | 180 | 300 | 50 | equilibrado |
   | Intensivo | 120 | 300 | 420 | 60 | rigido |

   O perfil não toca em dias, nível, estratégia, energia, banca nem pesos.

2. **Quanto você estuda** — dias da semana (7 botões); régua única com três marcas
   (mínimo, ideal, forte), cada uma com − e + de 15 min, mantendo mínimo ≤ ideal ≤ forte
   (empurra a vizinha); melhor turno; cobrança como três opções, cada uma dizendo o que
   conta como dia cumprido ("a partir de 2h33").
3. **Como o dia é montado** — nível, estratégia, tamanho do bloco (− / + de 5 min),
   energia base, energia de hoje, como o cronômetro começa, foco estratégico.
4. **O que pesa na sugestão** — os 8 critérios e, logo abaixo, as horas da semana com a
   distribuição por matéria (o atual "Planejamento da semana").
5. **Reta final** (recolhido) — ligar sozinho, quantos dias antes, reduzir teoria.
6. **Prova e prática** (recolhido) — banca, plataforma de questões, tela ao abrir,
   flashcards avançados.

Os `id` dos campos (`aj-f-*`, `aj-plataforma`) e as âncoras `aj-perfil`, `aj-ritmo`,
`aj-metas`, `aj-plan` continuam existindo: a busca de ajustes e os testes atuais dependem
deles. "Voltar ao padrão" e a contagem da aba seguem a mesma lista de `AJ_SECOES`.

### Prévia fixa

Total do ciclo de hoje × meta, veredito (o texto atual de `ajPrevVeredito`), barra do dia
por matéria, lista de blocos, horas da semana, limiar do dia cumprido e "reta final em N
dias" quando há data de prova. Recalcula a cada ajuste, como hoje.

### Mudanças de comportamento do PR 1

- **Tempo × meta**: a régua é a fonte única. `metaIdeal` continua espelhada em
  `prefs.metaDiaria`; `tempoDia` passa a ser gravado igual a `metaIdeal` (quem lia o
  rótulo antigo continua certo). O cartão "Meta diária de estudo" e o campo "Tempo médio
  por dia" saem: a régua os substitui.
- **Energia**: `orient.energia` é a base de todo dia. "Energia de hoje" grava
  `energiaPlano` + `energiaDia` (o dia de estudo de `_hoje()`). `_enMult()` usa
  `energiaPlano` só quando `energiaDia` é hoje; senão, a base. Migração na leitura, uma
  vez: quem tem `energiaPlano` diferente de `energia` e não tem `energiaDia` recebe
  `energia = energiaPlano` — ninguém muda de ritmo sem ter pedido. `energiaDia` mora
  dentro de `orient`, que já sincroniza inteiro.
- **Cobrança**: mesma regra de hoje (50/85/100 % da meta ideal), agora escrita na tela e
  na prévia.

## PR 2 — nível e estratégia mudam o ciclo

Em `_genVolta` e `_extrasDoDia`. O padrão de fábrica (intermediário + ciclo por blocos)
produz **exatamente** a volta de hoje.

### Nível (o conteúdo de cada bloco)

| Nível | Regra |
|---|---|
| Iniciante | Teoria sempre antes: a matéria não abre com questões do tópico frágil. Blocos de questões com 0,6 × o bloco. |
| Intermediário | Como hoje: abre com questões do tópico frágil quando há sinal; teoria dos pontos pendentes; questões na segunda passada (0,8 × o bloco). |
| Avançado | Questões antes: cada ponto pendente entra primeiro como questões (bloco inteiro) e só na segunda passada como teoria (0,7 × o bloco); a revisão geral vem antes de lei seca e jurisprudência. |

### Estratégia (a ordem e os extras)

| Estratégia | Regra |
|---|---|
| Ciclo por blocos | Como hoje: intercala, nunca a mesma matéria duas vezes seguidas quando há outra. |
| Sequencial | Blocos da mesma matéria ficam juntos: toda a cota da matéria de maior peso, depois a seguinte. |
| Foco em revisão | Extras do dia: até 3 blocos de revisão vencida (um por matéria, 45 min no máximo cada) em vez de 1. Na volta, toda matéria com sessões registradas abre com o bloco de revisão geral. |

### Quando vale

Mudar nível ou estratégia refaz os blocos **ainda não concluídos** da volta atual pelo
mesmo caminho que a energia de hoje já usa (`_recomporDia`); bloco concluído nunca é
tocado. No modo manual nada muda: o ciclo é da pessoa.

## Dados e sincronização

- Chave nova: só `orient.energiaDia` (entra em `AJ_ORIENT_PADRAO` como `''`).
- Nenhuma chave `catedra:` nova, nenhum array novo, nada em `_autosaveKeys()` a mais.
- Nenhuma rede, nenhuma dependência nova, sintaxe compatível com JavaScriptCore.

## Testes

PR 1 — `tests/ajustes-ritmo.mjs`, ligado em `run.mjs` e `run-webkit.mjs`:

- aplicar cada perfil grava os seis valores (lendo o storage ≥ 1,3 s depois) e marca o
  cartão; "Desfazer" restaura; alterar um valor mostra "Personalizado";
- a régua nunca deixa mínimo > ideal > forte e espelha `metaDiaria` e `tempoDia`;
- energia de hoje vale hoje e volta à base no dia seguinte (relógio fixo, contexto
  próprio); a migração preserva quem tinha energia baixa ou alta;
- a prévia continua dentro da janela depois de rolar até o fim (caixa medida) em 1280 px,
  e a faixa compacta em 768 px; sem rolagem lateral em 768 e 390 px;
- contraste calculado ≥ 4,5:1 nos textos da prévia e dos cartões, claro e escuro; alvos
  ≥ 44 px com toque; captura olhada.

PR 2 — `tests/ciclo-nivel-estrategia.mjs`:

- fábrica gera volta idêntica à de antes (mesma sequência matéria/tipo/minutos, com
  edital semeado);
- iniciante: nenhuma matéria abre com questões; avançado: o primeiro bloco de cada ponto
  pendente é de questões;
- sequencial: nenhuma matéria reaparece depois de outra ter começado; foco em revisão: 3
  extras com 3 matérias vencidas;
- mudar a estratégia no meio da volta preserva os blocos concluídos.

## Fora do escopo

Outras abas de Ajustes; o modo manual do ciclo; SwiftUI nativo (a aba é web embutida).
