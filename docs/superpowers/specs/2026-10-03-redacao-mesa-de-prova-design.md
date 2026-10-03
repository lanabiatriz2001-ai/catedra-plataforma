# Redação — Mesa de prova (fatia 1 de 3)

Data: 03/10/2026 · Branch: `redacao-mesa-de-prova` · Tela: view `redacao`, etapa 2 (responder)

## Por que

A dona pediu para modernizar os campos e as funções de responder e corrigir discursiva:
o campo da questão, o da resposta, o do espelho, o resultado e o motor da correção. É a
tela inteira, então o trabalho foi fatiado em três PRs, nesta ordem:

1. **Mesa de prova** (esta spec) — os três campos da etapa 2.
2. **Motor da correção** — `submitRed` e `_corrigeRedacaoLivre`: resposta estruturada da
   IA, estados de espera e erro na tela, resposta que nunca se perde.
3. **Resultado anotado** — o Raio-X anota o texto da pessoa, nota por quesito, reescrever
   e recorrigir. Depende da fatia 2.

Sucesso desta fatia: responder parece prova de verdade. A pessoa relê o comando sem rolar,
escreve numa folha pautada que conta as linhas contra o limite da banca, vê o tempo e vê
que o texto está salvo; e sabe, antes de entregar, se o espelho serve para corrigir.

## O que NÃO muda

- O fluxo em três etapas (`redEtapa1/2/3`) e a regra de que o espelho fica guardado até a
  entrega (`redEspelhoOculto`, "Ver mesmo assim").
- As chaves salvas: `redText`, `redTextTs`, `redGabarito`, `redEnunciado`, `redMarcas`,
  `redDisciplina`, `redHist`, `catedra:red`. Nada é migrado nem renomeado.
- `submitRed`, `_corrigeRedacaoLivre`, `_redFallbackLivre`, o prompt e a etapa 3 (fatias 2 e 3).
  Única exceção: a entrada do histórico ganha o campo `tempoMs`.
- Os selos "Sem espelho oficial" e "Sugerido — não oficial" e o fluxo do espelho sugerido (C3).
- A faixa "Rascunho salvo" (U4) e seus testes. Só o emoji ✍️ dá lugar a um SVG Lucide.

## Arranjo

Contêiner novo `.ct-mesa` em `catedra-ui.css`:

- Largura de conteúdo ≥ 1024 px: grade de duas colunas (`minmax(0,5fr) minmax(0,6fr)`),
  questão à esquerda e folha à direita. A coluna da questão é `position:sticky` com rolagem
  própria e altura máxima da janela.
- Abaixo disso: uma coluna. A questão vai para o topo dentro de um bloco recolhível
  (aberto por padrão; recolhido mostra título e chips).
- A faixa do espelho ocupa a largura inteira abaixo das duas colunas.

A decisão é por largura do contêiner (container query com fallback em media query), não
por aparelho: iPad deitado fica lado a lado, iPad em pé empilha.

## Campo da questão

- Cabeçalho (`ct-hero` compacto): rótulo, `redProvaTitulo`, e chips em `--mono`:
  limite de linhas (de `_redLimiteLinhas`) e número de comandos (blocos `ehItem` de
  `_redBlocos`). Chip sem dado não aparece.
- O seletor "Disciplina desta correção" (`#red-disciplina`, `onRedDisciplina`) sobe para
  o rodapé desta coluna, com o mesmo `id`, a mesma ajuda e o mesmo comportamento.
- Corpo: os blocos de `redBlocos` como hoje, com a medida de leitura (`ct-leitura`).
- Marcações: seleção e paleta como hoje (`onSelEnunciado`, `marcarEnunciado`). A lista
  "Marcações e notas" sai da coluna lateral `ct-enun-lado` e vira um bloco recolhível
  abaixo do texto, com o contador `redMarcasN` no título. Estado de tela `redMarcasAberto`.
- "Editar questão": só quando `!redModoProva` (enunciado colado pela pessoa). Alterna o
  corpo para um `textarea` ligado a `onRedEnun`. Questão do banco não é editável.

## Campo da resposta (a folha)

- Continua sendo o mesmo `<textarea>` (`value="{{ redText }}"`, `onRedText`,
  `readonly="{{ redBusy }}"`). É o que preserva autosave, rascunho, ditado e teclado do iPad.
- Pauta: `background-image` em `repeating-linear-gradient` com passo igual ao `line-height`
  do campo, as duas medidas vindas do mesmo token (`--ct-folha-linha`). Fonte `--display`.
- Medida: `max-width` de cerca de 62ch, que dá ~11 palavras por linha, a mesma razão que
  `_redFallbackLivre` já usa para estimar linha manuscrita.
- Numeração: coluna à esquerda, `aria-hidden`, em `--mono`, rolando junto com o campo.
- Contador de linhas, uma única fonte de verdade por situação:
  - folha na medida cheia → linhas renderizadas (`scrollHeight` / altura da linha), lidas
    num `ResizeObserver` e a cada `oninput`, guardadas em estado de tela `redLinhasN`;
  - folha mais estreita que a medida → estimativa `ceil(palavras/11)`, e a numeração some.
  O rótulo é "N / L linhas" quando há limite e "N linhas" quando não há. O contador de
  palavras continua, menor, ao lado.
- Barra de progresso sob a barra de ferramentas quando há limite: `--accent` até 90%,
  `--warn` de 90% a 100%, `--danger` acima. A cor nunca é o único sinal: o rótulo passa a
  dizer "faltam N" / "passou N".
- Cronômetro progressivo `mm:ss` (`h:mm:ss` acima de 1 h), em `--mono`:
  - começa na primeira tecla; pausa ao sair da view, com a janela oculta ou durante `redBusy`;
  - acumula em `redTempoMs` (persistido, ver Dados); o tique é de tela;
  - zera junto com o rascunho (`redZerarRascunho`, `redReset`, `_abrirDiscursiva`);
  - na entrega, `submitRed` grava `tempoMs` na entrada do histórico.
  Sem contagem regressiva nesta fatia.
- Modo foco: botão na barra; estado de tela `redFoco`. Esconde a navegação e tudo que não
  é questão, folha e faixa do espelho. Esc ou o mesmo botão saem. Sair da view desliga.
- "Salvo às HH:MM" no rodapé da folha, a partir de `redTextTs`; "Ainda não salvo" antes da
  primeira tecla.
- Rodapé: o botão de entregar (`submitRed`, `redBtnLabel`, `redBtnDisabled`) e a dica
  `redDicaEtapa2`, como hoje.

## Campo do espelho

- Faixa guardada (`redEspelhoOculto`): passa a dizer o estado, calculado por `_redQuesitos`:
  - "N quesitos · X pontos · pronto para corrigir";
  - "Espelho em prosa — a correção será por cobertura" quando há texto e nenhum quesito;
  - "Falta o espelho" com "Colar ou importar" quando está vazio.
- Aberto (`redEspelhoAberto`): duas vistas num seletor segmentado, estado de tela `redGabVista`:
  - **Quesitos**: lista só de leitura com número, texto, pontuação máxima e escala;
  - **Texto**: o `textarea` atual (`onRedGab`), editável. É a vista padrão quando não há quesitos.
- Importar PDF/TXT (`importRedGab`): o estado vai para a própria faixa — "Lendo
  arquivo.pdf…", "arquivo.pdf importado" e "Não consegui ler arquivo.pdf", este com
  `role="alert"`. Estado de tela `redGabErro`. Os toasts dessa função saem.

## Dados e sincronização

- Estado novo persistido: `redTempoMs` (número). Entra em `_autosaveKeys()` e na lista de
  chaves de `_rehydrateFromLocal` ao lado de `redTextTs`, e sincroniza como `redTextTs`.
  As duas listas são conferidas juntas.
- Estado só de tela, fora do autosave: `redFoco`, `redLinhasN`, `redGabVista`,
  `redGabErro`, `redMarcasAberto`, `redQuestaoAberta`, `redEditandoEnun`.
- `tempoMs` na entrada de `catedra:red` é opcional: entradas antigas não o têm e nada o exige.
- Nenhum arquivo novo no app, logo `scripts/build.mjs` e `scripts/build-macos.mjs` não mudam.

## Regras de design aplicadas

Tokens sempre (nenhum hex, nenhum px solto no host); sem faixa lateral colorida; ícones
Lucide 16 px com `aria-hidden`; texto ≥ 4,5:1; alvos ≥ 44 px no toque; animações (barra,
entrada do modo foco) desligadas sob `prefers-reduced-motion`. Sintaxe compatível com
JavaScriptCore; `ResizeObserver` com guarda de existência (sem ele, vale a estimativa).

## Erros e bordas

- Sem limite de linhas no enunciado: sem barra e sem "/ L".
- `redBusy`: folha `readonly`, cronômetro pausado, botões do espelho desabilitados.
- Enunciado vazio: a etapa 2 não aparece (regra atual).
- Abrir correção do histórico (`redOpenHist`) não mexe em `redTempoMs` do rascunho em curso.

## Testes

Módulo novo `tests/redacao-mesa.mjs`, chamado por `run.mjs` e `run-webkit.mjs`. Semeadura
por `base + '/__semente'`; leitura do storage ≥ 1,3 s depois da ação; relógio fixo em
contexto próprio para o cronômetro.

1. 1280 px: caixas da questão e da folha lado a lado (mesmo topo, `x` distintos); 768 px:
   empilhadas, questão acima.
2. Pauta: passo do gradiente igual ao `line-height` computado do `textarea`.
3. Contador: texto semeado de N linhas renderizadas mostra N; com limite 30, a barra troca
   para `--warn` em 27 e `--danger` em 31, e o rótulo muda de texto.
4. Cronômetro: não anda antes da primeira tecla; anda com o relógio; pausa fora da view;
   `redTempoMs` persiste e volta após recarregar; zera com "Começar do zero".
5. Modo foco: navegação fora da tela (caixa medida), Esc restaura.
6. Espelho: com quesitos semeados, a faixa guardada mostra a contagem e a soma; vista
   Quesitos lista N itens; espelho em prosa cai na vista Texto com o aviso.
7. Questão colada mostra "Editar questão"; questão do banco não.
8. Contraste calculado ≥ 4,5:1 nos rótulos novos (claro e escuro) e alvos ≥ 44 px em
   viewport de toque.
9. Regressão: os casos U4 do rascunho e o seletor de disciplina seguem verdes; captura de
   tela conferida em 1280 e 768.

## Entrega

`npm test` e `npm run test:webkit` verdes, PR único, merge pelo GitHub. Build e instalação
no Mac e no iPad ficam com a sessão instaladora ("Fusão de melhorias do Codex"), avisada
quando o PR entrar na `main`.
