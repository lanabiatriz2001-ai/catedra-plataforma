# Redação — Resultado anotado (fatia 3 de 3)

Data: 03/10/2026 · Branch: `redacao-resultado-anotado` · Depois de: Mesa de prova (#210) e Motor da correção (#212)

## O que muda na tela da nota

- **Nota por quesito, desenhada**: uma linha por quesito com barra na largura da nota, "obtido / máximo",
  situação, o trecho que pontuou e o que faltou. Vale para correção por IA, estimativa local e
  conferência própria (todas trazem `res.quesitos`). Resultado sem quesitos (espelho em prosa, entradas
  antigas) mantém a lista antiga.
- **Sua resposta, anotada**: o texto da pessoa inteiro, com o trecho que pontuou em cada quesito
  marcado e rotulado (Q1, Q2…). Só aparece quando a correção trouxe trecho localizado. Substitui o
  comparativo antigo por termos-chave, que continua para os demais casos.
  - Miolo em `redacao-motor.js`: `localizar(resposta, trecho)` e `anotar(resposta, itens)`. A busca
    ignora caixa e espaços, mas as posições são do texto original; os segmentos remontam o texto
    caractere a caractere; trecho inexistente ou sobreposto fica de fora.
- **Reescrever e comparar**: "Reescrever esta resposta" (ou "Refazer à mão", na conferência própria)
  volta à folha com o mesmo enunciado e o espelho guardado de novo; quem digitou recebe o texto
  anterior. A nova entrada do histórico guarda `anteriorId`, e a tela da nota mostra "Antes e depois":
  nota anterior → nova, diferença, e quesito a quesito o que subiu, caiu ou ficou igual.

## Conserto de passagem

A medição da folha dentro do aviso do `ResizeObserver` fazia o navegador acusar "ResizeObserver loop",
que o app mostrava como erro na tela em larguras de tablet. A medição foi para o quadro seguinte.

## Dados

`anteriorId` na entrada de `catedra:red`, opcional. Estado de tela: `redReescritaDe`, `redReescritaNota`.

## Testes

`tests/redacao-resultado.mjs`: Node (anotar/localizar) e navegador com IA simulada (texto anotado que
pinta, barra medida, reescrita e comparação, conferência própria, contraste e toque em claro e escuro).
