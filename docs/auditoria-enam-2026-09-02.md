# Auditoria do banco oficial do ENAM (P9 / E2) — 02/09/2026

*Pedido da Lana: ler os cinco editais um a um e analisar todas as questões e gabaritos
detalhadamente. Este documento registra o que foi lido, o que foi medido e o que mudou no
banco por causa disso. Fontes em `scripts/fontes/enam/FONTES.md`.*

## 1. Os cinco editais, um a um

| Edição | Edital | Data e horário (item 8.1) | Questões (8.5) | Quadro 8.6 | Habilitação (3.7/3.8) | Nota zero (8.9) |
|---|---|---|---|---|---|---|
| I · 2024.1 | Edital de Abertura n. 01/2024 (DOU) | 14/04/2024, 13h–18h, 5h, horário de Brasília | 80, 5 alternativas, uma correta | 16/10/6/6/12/12/6/12 (art. 4º da Resolução ENFAM n. 7/2023) | 70 %; 50 % para autodeclaradas negras ou indígenas | mais de uma ou nenhuma resposta, emenda ou rasura |
| II · 2024.2 | Edital retificado em 15/08/2024 | 20/10/2024, 13h–18h, 5h | idem | idem | 70 %; 50 % para negras, indígenas ou com deficiência | idem |
| III · 2025.1 | Edital v3 (04/02/2025) | 18/05/2025, 13h–18h, 5h | idem | idem | idem | idem |
| IV · 2025.2 | Edital retificado em 11/07/2025 | 26/10/2025, 13h–18h, 5h | idem | idem | 70 %; 50 % para negras, indígenas, **quilombolas** ou com deficiência | idem |
| V · 2026.1 | Edital v2.1 | 07/06/2026, 13h–18h, 5h | idem | idem | idem (com quilombolas) | idem |

O quadro 8.6 é **idêntico nas cinco edições**, inclusive na nota do Direito Constitucional:
"podendo ser incluídas questões de Direito Constitucional do Trabalho, Direito Constitucional
Tributário e Normas Constitucionais de Processo Penal". Por isso `CT_ENAM.AREAS` guarda uma cota
só, sem cota por edição, e a lista `disciplinasApp` passou a dizer "Direito Constitucional
Tributário" (o nome do edital), não "Direito Tributário".

O que mudou entre editais é o rol da habilitação a 50 %: só negras e indígenas em 2024.1; com
deficiência a partir de 2024.2; quilombolas a partir de 2025.2. O app guarda só a meta como
número (56 ou 40), sem campo de autodeclaração, então nada disso vira dado pessoal.

Os cinco editais dizem que as provas se apresentam em tipos com ordem embaralhada e que o
caderno só pode ser levado nos últimos 30 minutos; nenhum descreve a correspondência entre
tipos — ela só aparece no gabarito definitivo de 2024.1.

## 2. As questões e os gabaritos, um a um

### 2.1 Fidelidade da extração

O banco vem do caderno **tipo 1** de cada edição. Para provar que o texto extraído é o da prova
(e não um artefato do PDF), cada questão foi cruzada com o caderno **tipo 2** da mesma edição
(baixado só para a conferência, fora do repositório):

| Edição | Pares por enunciado | Enunciado inteiro igual | Mesmas 5 alternativas | Resposta igual pelo texto | Anuladas nos dois tipos |
|---|---|---|---|---|---|
| 2024.1 | 80/80 | 80/80 | 80/80 | 78/78 | 2 (66, 74) |
| 2024.2 | 80/80 | 80/80 | 80/80 | 78/78 | 2 (25, 62) |
| 2025.1 | 80/80 | 80/80 | 80/80 | 79/79 | 1 (34) |
| 2025.2 | 80/80 | 80/80 | 80/80 | 79/79 | 1 (28) |
| 2026.1 | 80/80 | 80/80 | 80/80 | 79/79 | 1 (42) |

"Resposta igual pelo texto" significa: a alternativa que o gabarito do tipo 1 aponta tem o mesmo
texto da alternativa que o gabarito do tipo 2 aponta para a questão gêmea — o que confere o
gabarito e a leitura das alternativas ao mesmo tempo, independentemente da ordem embaralhada.

Em 2024.1 o gabarito definitivo traz a **tabela de correspondência** dos quatro tipos: o gabarito
do tipo 1 foi conferido contra os tipos 2, 3 e 4 questão a questão — **240 de 240** iguais,
inclusive as duas anuladas. Essa conferência virou teste de regressão em `tests/run.mjs`.

### 2.2 O que a varredura apontou, e o que era de fato

- **"Realização" no fim da alternativa E da questão 80** (as cinco edições): é a palavra da
  contracapa colada pela extração. Corrigido no parser (a contracapa é moldura; a leitura para
  na questão 80). Só essas cinco alternativas mudaram no banco.
- **Glifo privado U+F020** (marcador de lista da fonte Symbol) na moldura de página de 2024.1,
  colado ao fim da última alternativa de 21 páginas. Corrigido (área de uso privado é removida).
- **Cor do caderno na moldura** ("TIPO VERDE – PÁGINA 5"): o parser só conhecia "BRANCA"; agora
  conhece as quatro cores — necessário para a conferência com o tipo 2 e para a edição VI.
- **144 enunciados "sem pontuação final"**: são os de completar a frase ("é correto afirmar que a
  norma é", "As afirmativas são, respectivamente,", "Está correto o que se afirma em") — as
  alternativas seguem em minúscula ou como "V – F – V". Conferidos um a um pela última palavra;
  nenhum truncado.
- **3 questões com alternativas em caixa mista** (2024.1: 2, 56, 57): assim está no caderno.
- **1 alternativa de dois caracteres** (2024.1 q60, "I."): é o formato da questão.
- **1 "texto a seguir"** (2024.2 q29): o texto está no enunciado.
- **66 questões de itens I/II/III**: todas com os itens presentes no enunciado.
- **Nenhuma** questão com número da questão seguinte embutido, alternativa repetida, frase de
  capa/instrução ou mojibake.

### 2.3 Anuladas

7 questões ficam no banco com `anulada:true` e gabarito vazio, e nunca entram em simulado:
2024.1 (66, 74), 2024.2 (25, 62), 2025.1 (34), 2025.2 (28), 2026.1 (42). As duas anulações de
2024.1 são as do gabarito "pós-anulação" de 28/05/2024, o mais recente publicado.

### 2.4 Referência normativa

59 questões trazem `refs` — só o que o próprio texto cita ("Art. 42 do CP", "Súmula Vinculante
13", "Tema 1.234"). Não há comentário de terceiros nem comentário gerado.

## 3. O que fica pendente

- O comentário próprio por questão (degrau 2 do item 5 da especificação) não foi feito.
- Os cadernos tipo 2 conferidos não são versionados: a conferência é reproduzível com os
  scripts de rascunho descritos aqui, mas o teste da CI cobre só a tabela de 2024.1.
