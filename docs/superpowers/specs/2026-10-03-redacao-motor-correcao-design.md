# Redação — Motor da correção (fatia 2 de 3)

Data: 03/10/2026 · Branch: `redacao-motor-correcao` · Depois de: Mesa de prova (PR #210)

## Por que

A correção por IA não era conferida. A nota final era a que o modelo dava; nada garantia que a
nota de um quesito respeitava a escala da banca; a evolução recebia quatro critérios genéricos
no lugar dos quesitos; quando a IA falhava, o app caía calado no corretor local; espelho e
enunciado longos eram cortados em silêncio; os avisos eram toasts.

## O que muda

- **Miolo puro em `redacao-motor.js`** (`window.CT_REDACAO_MOTOR`), testado no Node:
  - `montarPrompt({enunciado, gabarito, quesitos, resposta})` → `{prompt, cortes}`. O pedido leva
    os quesitos lidos pelo app, cada um com máximo e escala. Limites: resposta 15.000, enunciado
    8.000, quesito 500, espelho em prosa 12.000 caracteres; o que passar é cortado e DITO em `cortes`.
  - `interpretar(json, {quesitos, resposta})` → resultado conferido, ou `null`:
    nota de cada quesito encaixada no degrau da banca; nota final = soma calculada pelo app;
    trecho só fica se existir literalmente na resposta; quesito pulado sai marcado `estimado`;
    mais da metade pulada = falha. Espelho em prosa: `pontos` com situação, trecho e o que faltou.
  - `motivoDaFalha(err)` e `MOTIVOS`: sem-ia, recusou, cota, rede, tempo, invalida, erro.
- **Fora do espelho**: português, estrutura e extensão vêm com nota 0–10 e comentário, não entram
  na nota e aparecem marcados "fora do espelho".
- **Decisão da dona — falha da IA**: sai a estimativa do corretor local, com uma faixa dizendo o
  motivo e o botão "Corrigir de novo com IA", que substitui a entrada do histórico e o registro da
  evolução (mesmo id, carimbo novo), em vez de duplicar.
- **Espera**: tempo decorrido e "Cancelar" na folha; cancelar não grava nada e ignora a resposta
  que chegar depois. 90 segundos sem resposta = falha (`tempo`).
- **Avisos junto do botão**: "Faltam N palavras", "Falta o espelho", cota do dia zerada.
- **Histórico**: `motor` ('ia' | 'local'), `falhaIA` (motivo) e `evoId` (registro da evolução), opcionais.
- **Corretor local** passa a devolver `quesitos` (nota por quesito), usado para preencher quesito
  pulado pela IA e para a evolução.

## O que não muda

A conferência própria, o papel primeiro, o corretor local como piso e a tela da nota (o visual
novo do resultado é a fatia 3; aqui ela só ganha a faixa de falha e o aviso de corte).

## Testes

`tests/redacao-motor.mjs`: parte 1 no Node (escala, soma, trecho inventado, quesito pulado,
resposta inválida, cortes, motivos); parte 2 no navegador com a IA simulada (sucesso, cancelar,
falha de rede e corrigir de novo, formato inválido, sem IA, tempo esgotado, aviso junto do botão).
