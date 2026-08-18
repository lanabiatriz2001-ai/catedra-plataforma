# Ciclo de Estudos — redesenho do cadastro

Validado com a Lana em 18/08/2026. É, nas palavras dela, "a parte mais importante do app".

## O problema

Três queixas: **confuso**, **apertado**, e **confundindo as semanas/roteiros**.

Apurado no código:

1. **Apertado.** A agenda é `grid-template-columns: repeat(8, minmax(196px,1fr))` dentro de
   `overflow-x:auto` — 1.568px de largura mínima. No iPad rola de lado sempre. Dentro de cada
   coluna de 196px cabem quatro seletores de 11px, e a cascata de subtópico que entrou em
   17/08 piorou isso.
2. **Semana × roteiro.** `roteiro` é um campo de TEXTO LIVRE cujo número sai por regex
   (`_n()`), enquanto o cabeçalho mostra "Semana X" com faixa de datas vinda do calendário.
   Navegar entre roteiros troca o título e mantém as datas da semana corrente.
3. **Confuso — a causa de raiz.** A tela se chama *Ciclo de Estudos* mas implementa uma
   agenda por dia da semana, e ao lado dela existe uma segunda caixa ("Atividades
   rotativas") que é o ciclo de verdade. Dois sistemas paralelos, sem nada explicando como
   se encaixam.

## As decisões

| Pergunta | Resposta da Lana |
|---|---|
| Como você planeja? | "Os dois juntos" — fixo por dia E rodízio |
| O rodízio ainda faz sentido? | "Ele vira um modo de estudo por ciclo e o outro por cronograma" |
| No modo Ciclo o dia importa? | "Não — é fila contínua" |
| O que é "roteiro"? | "Uma versão do meu ciclo" (sem data) |
| Migração do que já existe | "Mantenha o meu como cronograma" |
| Ponteiro do Ciclo | "Andar ao concluir uma atividade do ciclo" |

## O modelo

**Estrutura** (nova, escolhida pela pessoa) — a identidade da tela:

- **Ciclo** — fila contínua ordenada de blocos. NÃO tem dia da semana. Um ponteiro marca
  onde parou; conclui um bloco, anda para o próximo. Parou no 2 hoje, amanhã começa no 3.
- **Cronograma** — tarefas com dias marcados. Uma tarefa, VÁRIOS dias.

O campo `dia` (um valor só) vira `dias` (lista). "Todo dia" deixa de ser um conceito
especial e passa a ser os sete dias marcados.

**Versão** (era "roteiro") é ortogonal e vale para as duas estruturas: "Semana normal",
"Reta final". Troca a lista inteira sem perder a outra. **Sem data por perto** — era isso
que embaralhava com a semana do calendário.

**Gerar** (era o cartão "Como montar seu ciclo") deixa de ser um modo e vira botão:
*Sugestão da plataforma · Conforme o edital · Pesos e pontos*. Preenchem a lista; editar
depois é o estado normal. O cartão "Manual" some — manual passa a ser o padrão.

## Migração

As atividades atuais (`manualFixed`, cada uma com um `dia`) viram tarefas de **Cronograma**
com aquele dia marcado; as de "Todo dia" (`dia:''`) ficam com os sete. A conta da Lana
começa em Cronograma. `manualRot` (rotativas) vira a fila do modo Ciclo. Ninguém perde
nada.

## O que sai

- A grade de 8 colunas com rolagem lateral. Dias viram linhas verticais.
- A caixa "Atividades rotativas" como coisa separada — ela **é** o modo Ciclo.
- O campo de texto livre do roteiro e o `_n()` que extraía número por regex.
- A faixa de datas ao lado do seletor de versão.

## O cartão de atividade

Campos de largura inteira, rótulo em cima, 14px (era 11px). Disciplina → tópico →
subtópico empilhados; atividade e minutos na mesma linha. O subtópico só aparece quando o
tópico tem subtópicos.

## Protótipo

`scratchpad/ciclo-proto.html` — clicável, os dois modos, aprovado pela Lana em 18/08.
