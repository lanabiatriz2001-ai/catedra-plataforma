# Especificação — 7 melhorias da plataforma Cátedra

Escrita para quem vai implementar sem ter visto o código antes. Cada item traz: o
objetivo, o que **já existe** (com arquivo e chave de estado reais), o que construir,
onde mexer, critérios de aceite e armadilhas conhecidas.

## Regras da casa (valem para todos os itens)

- **Onde o app vive.** O app principal é `Catedra.dc.html` (componente único, ~11 mil
  linhas, dc-runtime: `render()` devolve um objeto de variáveis consumidas por template
  `{{ var }}` / `<sc-if>` / `<sc-for>`). Páginas satélites (LEGIS, JURIS, ritos, peças,
  2ª fase, prova oral…) são HTML independentes carregados em `<iframe
  data-ct-frame=…>`; a comunicação com o host é por `postMessage` (ver os handlers em
  `_acervoMsg` no `componentDidMount`).
- **Estado novo persiste em dois lugares.** Toda chave nova de estado que deve
  sobreviver ao fechamento entra em `_autosaveKeys()` (Catedra.dc.html) — senão não é
  gravada nem sincronizada. Se a chave for um **array de objetos**, cada item precisa
  de `id` único e carimbo `up` (ms) a cada edição, e a chave entra em `ARRAY_ID` no
  `auth.js` — é o que dá merge por id entre aparelhos e faz exclusão colar (lápides).
  Escalares/objetos já são cobertos pelo carimbo por chave (`catedra:_kts`), sem ação.
- **Arquivo novo entra no bundle.** Página ou .js novo precisa ser adicionado às listas
  de cópia em `scripts/build.mjs` (site) e `scripts/build-macos.mjs` (app do Mac).
- **Testes.** A suíte `tests/run.mjs` (roda no CI a cada push via
  `.github/workflows/testes.yml`) deve ganhar casos para cada item. Rodar local:
  `npm test` com `CT_CHROME=/caminho/do/chrome`.
- **Nada de rede externa nova.** O app funciona offline e em `file://` no nativo; dados
  novos entram como .js/.json gerados por script em `scripts/` (padrão existente:
  `build-espelhos.mjs`, `build-questoes-prova.mjs` etc.).

---

## 1. Painel "onde estou fraca"

**Objetivo.** Uma tela (ou bloco no início) que cruza o que o app já registra e ordena
as disciplinas por prioridade de estudo, com o porquê visível: *"Processo Penal —
muitos erros recentes, revisões atrasadas, alta incidência: comece por aqui"*.

**O que já existe.**
- `catedra:errors` — caderno de erros; cada item tem `disc` e tópico (conferir o shape
  exato onde o app cria itens, ~linha 6979 de Catedra.dc.html).
- `catedra:reviews` — revisão espaçada com intervalos `[1,3,7,15,30]` dias; dá para
  contar vencidas/atrasadas por disciplina.
- `catedra:sessions` — registro de sessões de estudo (disciplina, tópico, categoria,
  minutos): é o tempo por disciplina.
- `incidencia.json` + `incidencia.js` — incidência de artigos por diploma nos ~25 mil
  julgados do acervo E nas provas (`meta.provas`); mapeia diploma→disciplina.
- `catedra:sim` / `catedra:simAnalysis` — desempenho em simulados.
- `catedra:edital` — as disciplinas dela com pesos (a proporção do que cai).

**O que construir.**
1. Uma função pura `prioridadeDisciplinas(estado)` que devolve, por disciplina do
   edital: nota de prioridade (0–100) e os fatores que a compõem, cada um normalizado:
   erros nos últimos 30 dias, taxa de acerto em simulado, revisões vencidas, dias sem
   estudar (via sessions), e peso/incidência. Pesos iniciais sugeridos: erros 30%,
   revisões vencidas 25%, tempo sem estudar 20%, desempenho em simulado 15%,
   incidência/peso do edital 10%. Manter os pesos numa constante única e comentada.
2. Uma view nova `view:'prioridade'` (ou bloco no `inicio`): cartões ordenados por
   prioridade, cada um com os 2–3 fatores dominantes em texto claro e botões de ação
   direta — "Revisar agora" (abre as revisões da disciplina), "Ver erros", "Estudar"
   (abre registro de sessão pré-preenchido via `catedraOpenStudyRegistration`, que já
   existe).
3. A função pura vive num arquivo próprio (`prioridade-calc.js`) para ser testável fora
   do app.

**Aceite.** Com dados sintéticos no localStorage, a ordenação responde aos fatores
(mais erros → sobe; revisar → desce). Sem dado nenhum, a tela explica o que vai
aparecer ali em vez de mostrar zeros. Teste unitário da função pura em `tests/run.mjs`.

**Armadilhas.** Não criar cache persistente do cálculo (derive na hora do render;
é barato). Atenção ao nome de disciplina: `errors`/`sessions`/`edital` guardam strings
livres — normalizar com `trim().toLowerCase()` na comparação. Já existe
`prioridade-web.html`/`prioridade-dados.js` (Build B2) para **incidência em prova**;
não confundir: este painel é sobre o desempenho DELA — mas pode consumir aqueles dados
como o fator "incidência".

---

## 2. Erro vira revisão sozinho

**Objetivo.** Errou no simulado ou zerou quesito na 2ª fase → o item entra sozinho na
revisão espaçada e/ou no caderno de erros, sem cadastro manual.

**O que já existe.**
- O quiz do JURIS já faz isso para flashcards: o iframe posta `{type:'ctFlashcards',
  cards:[{front,back}], origem}` e o host cria os cartões (handler em `_acervoMsg`,
  itens `{id:'fc'+ts, front, back, disc, origem, criado, ia:true}`) com `_saveFC` +
  `flashSync`. **Este é o padrão a copiar.**
- Simulado: o fluxo de correção vive no host (`catedra:sim`, `simAnalysis`); o app já
  sabe qual questão foi errada, a disciplina e o fundamento.
- 2ª fase: `segunda-fase-web.html` corrige por quesito contra `espelhos.js`
  (`window.CT_ESPELHOS`: provas → quesitos); é um iframe, então o resultado precisa
  subir por `postMessage`.

**O que construir.**
1. No fim da correção do simulado (host): para cada questão errada, criar item em
   `catedra:errors` (se não houver um igual recente) e um flashcard
   pergunta→fundamento. Deduplicar por hash do enunciado nos últimos 30 dias, para
   refazer prova não duplicar tudo.
2. Na 2ª fase (iframe): ao fechar a correção, postar `{type:'ctErrosSegundaFase',
   prova, quesitos:[{titulo, nota, max, fundamento}]}` com os quesitos com nota 0 ou
   abaixo de 50%; o host transforma em `catedra:errors` (disc = matéria da prova) e em
   flashcards "quesito → o que o espelho exigia".
3. Toast no padrão da casa (`this._toast(...)`) dizendo quantos itens entraram, com
   ação "desfazer" que remove os ids recém-criados.

**Aceite.** Errar N questões no simulado gera N entradas (menos duplicatas) sem clique;
idem quesitos zerados na 2ª fase; "desfazer" remove tudo daquele lote. Teste: harness
posta `ctErrosSegundaFase` e verifica `catedra:errors` no localStorage.

**Armadilhas.** Volume: limitar o lote (ex.: 20 por correção, como o `ctFlashcards` já
faz com `slice(0,20)`). Itens criados precisam de `id` e `up` (regras da casa) para o
sync mesclar e a exclusão colar.

---

## 3. Prova oral em modo arguição

**Objetivo.** Simular a banca: pergunta sorteada → tempo para responder de viva voz →
só então o padrão de resposta oficial, com autoavaliação.

**O que já existe.**
- `oral.json` — 101 concursos; cada item tem `orgao, ano, cargo, banca, area,
  concurso` e `materiais[]` com `tipo` (`questoes_formuladas`, padrão de resposta,
  pontos sorteáveis, critérios). O conteúdo textual vem de
  `oral-conteudo.js`/`oral-conteudo.json`.
- A página da prova oral (via `oral.js`, filtros já convertidos em chips no Build B2)
  lista tudo isso para leitura.

**O que construir.**
1. Botão "Modo arguição" na página da prova oral: escolhe banca/área (usa os filtros
   existentes) e sorteia perguntas dos materiais `questoes_formuladas`.
2. Tela de arguição: a pergunta em destaque, cronômetro regressivo configurável
   (padrão 3 min — as bancas variam), botão "responder agora"; terminou o tempo ou o
   clique → mostra o padrão de resposta correspondente e três botões de
   autoavaliação: "Respondi bem / Parcial / Não sabia".
3. "Não sabia" e "Parcial" alimentam o item 2 (viram erro/flashcard, mesmo canal
   `postMessage`). Sessão de arguição termina com um resumo (X perguntas, acertos
   autoavaliados, tempo médio).
4. **Voz (segundo degrau, entregar separado):** ler a pergunta com
   `speechSynthesis` (pt-BR, nativo do navegador/WKWebView, zero dependência).
   Reconhecimento de fala fica FORA por ora — `SpeechRecognition` não existe no
   WKWebView do iPad; não prometer.

**Aceite.** Dá para fazer uma arguição de 5 perguntas de uma banca escolhida, com
cronômetro e padrão de resposta aparecendo só depois; autoavaliação "não sabia" gera
revisão. TTS lê a pergunta no site e no Mac.

**Armadilhas.** Nem todo material tem par pergunta↔padrão de resposta na mesma prova:
quando não houver padrão, mostrar os "critérios de avaliação" da banca no lugar, com
rótulo honesto. Sorteio sem repetição dentro da sessão.

---

## 4. Evolução da redação no tempo

**Objetivo.** Cada treino de redação/sentença corrigido deixa registro por quesito;
uma tela mostra a curva ("fundamentação subiu, dosimetria travou") e o plano de
correção vira tarefa no ciclo.

**O que já existe.**
- Redação em três telas no host (`catedra:redText/redGabarito/redEnunciado`), com
  plano de correção acionável (commits c878013/d954037).
- 2ª fase por quesito: `segunda-fase-web.html` + `CT_ESPELHOS` (586 quesitos em 36
  provas) — a nota por quesito já é calculada, só não é guardada.
- O ciclo/agenda aceita itens manuais (`catedra:manualFixed`/`manualRot`,
  `catedra:eventos`).

**O que construir.**
1. Chave nova `catedra:redHist` (array; **registrar em `_autosaveKeys` e em
   `ARRAY_ID` do auth.js**): `{id, up, quando, origem:'redacao'|'segunda-fase',
   prova/tema, quesitos:[{titulo, nota, max}], notaTotal}`. Gravar ao concluir cada
   correção (host grava; o iframe da 2ª fase manda por `postMessage`, mesmo canal do
   item 2).
2. Tela "Minha evolução" na área de redação: lista das tentativas, nota total no
   tempo (sparkline simples em SVG inline, sem lib), e por quesito recorrente o delta
   entre a primeira e a última tentativa, ordenado pelos que menos evoluíram.
3. Botão "levar para o ciclo" em cada item fraco do plano de correção: cria tarefa no
   ciclo/eventos com o texto do quesito e link de volta para o treino.

**Aceite.** Corrigir duas vezes a mesma prova mostra as duas tentativas e o delta por
quesito; a tarefa criada aparece na agenda da semana; histórico sincroniza entre
aparelhos (merge por id).

**Armadilhas.** Quesitos são strings longas: para casar entre tentativas, comparar por
prova+índice do quesito (estável no `CT_ESPELHOS`), não pelo texto. Não guardar o
texto da redação inteira no histórico (pesa no blob de sync) — só notas e títulos.

---

## 5. Terminar o bidirecional no app nativo (Mac/iPad)

**Objetivo.** No site, chip ⚖️/🏛️ abre o acervo **já buscando o termo** e há pílula
"← Voltar ao ponto do processo". No nativo, o shim só troca de aba e joga o termo
fora. Paridade: buscar ao chegar e voltar ao bloco exato.

**O que já existe.**
- Protocolo completo no site (PR #5): a mensagem `ctAbrirAcervo` carrega `termo` e
  `de:{view,rito,peca,bloco}`; a volta é `ctVoltarAcervo`; o ponto viaja na URL
  (`?rito=&peca=&bloco=` no ritos/pecas, `?q=&volta=1` no LEGIS/JURIS). Testes em
  `tests/run.mjs` ("ACERVO …").
- No Mac (`mac/Sources/main.swift`): o shim JS (injetado atDocumentStart) intercepta
  `ctAbrirAcervo` e chama `catedraNav` → `switchTo(1|2)`, descartando `termo` e `de`
  (~linhas 60–75 e o case `catedraNav` ~1330). As abas LEGIS/JURIS são **nativas**
  (stores Swift; ex.: `jurisStore.abrirVerbete(id)` já existe para abrir verbete).
- No iPad (`ios/Sources/main.swift` ~linha 306): mesmo shim, mesma lacuna.

**O que construir.**
1. Shim: repassar o payload inteiro — `catedraNav.postMessage({alvo, termo, de})` (hoje
   vai só a string `alvo`). Manter compatibilidade: se vier string, comportamento
   antigo.
2. Swift: no case `catedraNav`, além de `switchTo`, entregar o termo à aba de destino —
   LEGIS: aplicar o termo no campo de busca do catálogo/índice; JURIS: buscar no
   acervo (usar o caminho que `abrirVerbete`/busca já usam). Guardar `de` em uma
   propriedade `acervoOrigem`.
3. Botão "← Voltar ao ponto do processo" na aba nativa (toolbar), visível só quando
   `acervoOrigem != nil`: volta à aba Cátedra (`switchTo(0)`) e injeta no webview
   `window.__catedraGoView('areamod')` + recarregar o iframe com
   `?rito=&peca=&bloco=` — o caminho web da volta já sabe reabrir o bloco; a forma
   mais simples é o host web expor `window.catedraVoltarAcervo(de)` que reusa o
   handler `ctVoltarAcervo` existente (adicionar esse ponteiro global no
   `componentDidMount`, 3 linhas).
4. Limpar `acervoOrigem` ao usar a volta ou ao trocar de aba manualmente.

**Aceite.** No Mac e no iPad: chip ⚖️ num bloco do roteiro → aba LEGIS abre já
buscando o diploma; botão voltar → aba Cátedra no bloco exato, destacado. Site segue
igual (testes ACERVO continuam verdes).

**Armadilhas.** Buildar e testar no Xcode (Swift não compila no CI atual). A sessão
que trabalhou nisso antes deixou o estado "wired return paths, testing block loading"
— conferir se o Build B2 já trouxe parte disso feito antes de refazer (procurar por
`acervoOrigem`/`termo` nos dois main.swift).

---

## 6. Busca única no ⌘K

**Objetivo.** A paleta (⌘K, já existe) passa a achar também conteúdo: lei, súmula/
verbete, peça, rito e informativo — um campo só para navegar a plataforma inteira.

**O que já existe.**
- Paleta: estado `paletteOpen/paletteQuery`, atalho em `_onKey` (~linha 4965),
  handlers `openPalette/closePalette/onPaletteQuery` — hoje só telas e ações.
- Fontes de conteúdo, todas já no bundle: `leis-seca.js` (+`leis-seca-areas.js`) e o
  catálogo do LEGIS; `juris-index.js` (~25 mil verbetes, índice leve; texto em
  `juris-text.js`); `pecas.js` (`CT_PECAS`); `ritos.js`/`fluxos.js` (`CT_RITOS`/
  `CT_FLUXOS`); informativos no acervo do JURIS.
- Navegação por mensagem: `ctAbrirAcervo` (com `?q=`) e `?rito=`/`?peca=` — a paleta
  pode reusar exatamente o canal do item ida-e-volta.

**O que construir.**
1. Índice em memória, montado preguiçosamente na primeira busca (não no boot): lista
   plana `{tipo:'lei'|'verbete'|'peca'|'rito', titulo, extra, abrir()}`. Verbetes:
   usar `juris-index.js` (título/verbete apenas — não carregar `juris-text.js` para a
   paleta). Limitar a exibição a ~8 resultados por tipo.
2. Busca: normalizar sem acento/minúsculas; priorizar prefixo > palavra > substring.
   Seções no dropdown: "Telas e ações" (o que já existe) em cima, depois "Leis",
   "Jurisprudência", "Peças", "Ritos".
3. `abrir()` de cada tipo: lei → `setState({view:'legis', acervoBusca:titulo})`;
   verbete → idem com `view:'juris'`; peça → view roteiros com `origemAbrir=
   'peca=…'`; rito → view areamod com `origemAbrir='rito=…'` (mecanismo do PR #5,
   já pronto).

**Aceite.** ⌘K + "moro" acha a Lei de Improbidade nas leis; "súmula 619" acha o
verbete; "sentença" acha a peça e abre o roteiro. Primeira busca monta o índice sem
travar a UI (medir: < 150 ms com os índices já em memória).

**Armadilhas.** `juris-index.js` é grande mas já é carregado pelo iframe do JURIS —
para a paleta, carregar o script no host só na primeira busca (uma vez), nunca no
boot. Não indexar `juris-text.js`/`contas-text.js` (pesados demais para a paleta).

---

## 7. "O que mudou esta semana" na home

**Objetivo.** Bloco na home com os informativos recentes STF/STJ e alerta do que
importa para prova: entendimento superado, divergência STF×STJ, tese nova vinculante.

**O que já existe.**
- O acervo do JURIS traz informativos (grade de informativos, "informativo abre com o
  roteiro-widget" — ver `juris-web.html`, e o índice em `juris-index.js`).
- A home (`view:'inicio'`) já é modular em blocos; há o padrão de bloco com lista +
  link "ver tudo".
- Pipeline de dados por script em `scripts/` (padrão da casa) para gerar um resumo
  estático quando os dados são atualizados.

**O que construir.**
1. Script `scripts/build-semana-juris.mjs`: varre o acervo de informativos e gera
   `semana-juris.js` (`window.CT_SEMANA`) com os itens das últimas N edições:
   `{id, tribunal, informativo, titulo, tese, marcador:'superacao'|'divergencia'|
   'vinculante'|null, verbeteId}`. Os marcadores saem de heurística sobre o texto
   ("superado", "cancelada", "em sentido contrário", "repercussão geral", "Tema") —
   marcador `null` é permitido; melhor sem marcador que marcador errado.
2. Bloco na home: até 6 itens, os marcados primeiro, com selo colorido por marcador;
   clique abre o verbete no JURIS (canal `ctAbrirAcervo`/`acervoBusca` existente);
   rodapé "ver todos os informativos" leva à grade do JURIS.
3. "Marcar como lido" por item (chave escalar `catedra:semanaLidos`, registrar em
   `_autosaveKeys`) — lidos somem do bloco.

**Aceite.** Home mostra o bloco com itens reais do acervo; superação/divergência
aparecem com selo; clique cai no verbete certo; lidos não voltam (e sincronizam).

**Armadilhas.** NÃO buscar na internet em runtime — o bloco lê só o que o script
gerou no build (o acervo é atualizado por fora, como já acontece). Heurística de
marcador: conservadora, com os padrões de texto num só lugar comentado.

---

## Ordem sugerida de implementação

`2 → 4 → 1 → 6 → 7 → 3 → 5` — o 2 cria o canal de erros que o 4 e o 3 reusam; o 1
consome tudo; o 5 é o único que exige Xcode e pode andar em paralelo por outra sessão.
Um PR por item, cada um com seus casos novos em `tests/run.mjs`.
