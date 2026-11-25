# Redação — Leitura da IA depois da conferência própria

Data: 25/11/2026 · Branch: `redacao-segunda-leitura` · Depois de: Mesa de prova (#210), Motor (#212), Resultado anotado (#215)

## Por que

A CP Iuris e o Mege devolvem correção por IA sobre questão autoral, em data marcada. A Mesa de prova
já ganha deles em espelho oficial, nota por quesito com trecho e resultado na hora. Faltava o que só
quem faz à mão pode ter: ver onde a própria conferência e a leitura da IA discordam, quesito a quesito.
Decisão da dona (25/11): a IA recebe a resposta **digitada depois**, não foto da folha.

## O que muda

- Na tela da nota de uma **conferência própria**, um cartão "Comparar com a leitura da IA", **depois** de
  "Próxima tentativa" (o papel continua primeiro) e sem botão primário (o primário da tela é "Refazer à
  mão"). Convite fechado ("Digitar o que escrevi"); aberto, um campo com rótulo visível ("O que você
  escreveu no papel"), dica ligada ao campo (copiar sem melhorar; o texto fica guardado nesta correção),
  mínimo de 40 palavras e o espelho guardado da conferência.
- Disponibilidade dita ANTES de digitar: sem IA no aparelho, o cartão diz isso e não oferece o campo;
  com a cota do dia zerada, diz que a leitura fica para amanhã.
- "Pedir a leitura da IA" pede o consentimento ANTES da espera e usa o motor da correção
  (`_redCorrigirIA`) com duas diferenças: **sem reserva local** (quesito que a IA pular fica "a IA não
  avaliou", sem número) e com **a mesma régua da conferência** (`reguaDaConferencia`: quesito sem escala
  vai à IA com 0 / metade / cheio, os mesmos degraus que a pessoa tinha).
- A resposta vem quesito a quesito: `Q2 · você 0,10 · IA 0,30 · de 0,30 · a IA deu mais`, com o trecho
  que a IA pontuou (rotulado como dela) e o que ela disse que faltou quando deu menos. Divergência vira selo
  com fundo; os números são o que se lê primeiro. O rótulo é o número do quesito no espelho. O comentário
  geral da IA aparece. Resumo: "A IA deu nota diferente em N de M quesitos", e as duas notas.
- **A nota registrada continua a da pessoa.** Histórico, evolução e prioridade não mudam. A leitura fica
  guardada na mesma entrada, em `segunda` (com a transcrição em `segunda.texto`), e o carimbo `up` avança.
- **Quesito que a IA pulou**: "a IA não avaliou", sem número; sem total da IA ("—"); o resumo conta só os
  quesitos que ela leu e nomeia os que pulou.
- **Régua de um degrau** (espelho do banco com escala "0,40", ou intervalo lido como máximo 0): as duas
  leituras sairiam iguais à força, então o quesito fica "sem régua para comparar", fora da contagem, e o
  resumo o nomeia; sem total da IA. (A causa — o parser da escala do banco — é item próprio.)
- **Texto acima do limite** (15.000 caracteres): a dica avisa antes; a IA é avisada de que a resposta foi
  cortada (no pedido, para não descontar o que não recebeu); o cartão diz o que foi cortado depois.
- **Falha** (rede, cota, recusa, tempo, formato, IA pausada pelo console, sessão expirada): motivo dito no
  cartão e anunciado; nada é gravado; o texto continua no campo. Tempo esgotado diz que a chamada já contou
  na cota; a resposta tardia é descartada com tratador de erro.
- **Durante a leitura** o campo fica só para leitura (`readOnly`) e o foco vai para "Cancelar". Cancelar
  aborta a chamada e descarta a resposta tardia.
- Rascunho da transcrição por correção, na memória: trocar de correção e voltar não perde o texto. "Pedir
  uma nova leitura" reabre o campo com a transcrição guardada e avisa que a nova substitui a atual.
  Abrir a conferência pelo histórico não leva a transcrição para o rascunho da folha.
- Espelho sugerido (não oficial): o cartão diz que a IA lê contra o mesmo espelho sugerido.
- **Acessibilidade**: região viva fixa no cartão (anuncia a espera com frase fixa e a falha); foco no campo
  ao abrir, no resumo quando a leitura chega, na mensagem quando falha (texto, não botão), e de volta ao
  botão de origem ao fechar ou cancelar; no que chega sozinho, o foco não sai de um campo em que a pessoa
  esteja escrevendo fora do cartão.

## Miolo (`redacao-motor.js`)

- `compararLeituras(sua, ia)`: linhas por quesito (`igual`, `ia-mais`, `ia-menos`, `sem-nota`,
  `sem-regua`), contagens (divergentes, sem nota, sem régua, avaliados). Compara na precisão da tela (2
  casas). O total da IA sai pela MESMA conta da conferência (soma sobre o total arredondado): notas iguais
  dão total igual. Lista de tamanho ou máximo diferente não é comparada linha a linha (`desalinhado`).
  Quesito sem nota ou sem régua anula o total da IA (`notaIA` e `difNota` null).
- `naEscala`: a nota não passa do máximo depois de arredondar (quesito de 0,375 não vira 0,38).
- `motivoDaFalha`: motivos `pausada` e `sessao` (mensagens da `api/complete.js`).
- `montarPrompt`: avisos de corte com separador de milhar ("15.000") e a IA avisada do corte da resposta.

## Conserto de passagem

O campo da folha usava `readonly="{{ redBusy }}"`, que o runtime não traduz para a propriedade do React:
o campo não travava durante a correção. Passa a `readOnly`, como o campo novo.

## Dados

Campo novo opcional `segunda: {ts, nota (null se a IA pulou quesito ou há régua de um degrau), geral,
quesitos[], texto, words, cortes?}` na entrada de `catedra:red` (já sincronizada, `id` + `up`: a leitura
mais nova vence, como em toda entrada). O `texto` de topo da conferência própria continua vazio.
Estado só de tela: `redSegAberta`, `redSegText`, `redSegBusy`, `redSegErro` (fora do autosave).

## Testes

`tests/redacao-segunda.mjs`: Node (`compararLeituras`, régua de um degrau, totais, máximo de 3 casas,
desalinhado, número do quesito, motivos, aviso de corte) e navegador com IA simulada — convite e ordem dos
cartões, rótulo e dica do campo, falhas (rede e formato) que não gravam e são anunciadas, régua da
conferência no pedido, comparação por quesito (qual nota é de quem), comentário geral, nota registrada
intacta, evolução idêntica, `segunda.texto` e `up`, nada de `redSeg*` no storage, volta pelo histórico
sem mexer no rascunho, nova leitura com a transcrição guardada; quesito pulado; texto acima do limite;
cancelar (aborto e resposta tardia descartada); tempo esgotado (resposta tardia fora do formato sem erro de
página); IA indisponível; espelho em prosa; régua de um degrau; medidas em claro, escuro e 390 px
(contraste ≥ 4,5:1 na falha e no resultado, 44 px, selo e peso da divergência, números maiores que os
rótulos, nada vazando).
