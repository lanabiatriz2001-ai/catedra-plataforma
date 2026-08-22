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

---
---

# Parte 2 — Experiência de uso

Doze itens sobre COMO o app se sente, não sobre o que ele faz. As regras da casa da
Parte 1 continuam valendo. Os três de maior impacto: **U1, U3 e U5**.

## U1. Iframes vivos — troca de tela instantânea

**Objetivo.** Sair do LEGIS/JURIS/ritos/peças e voltar não recarrega a página nem
perde busca, scroll e painel abertos.

**O que existe.** Os iframes vivem dentro de `<sc-if>` por view (Catedra.dc.html
~linha 3119 em diante): trocar de view os REMOVE do DOM; `_montarFrames` põe o `src`
quando remontam. Toda a ida-e-volta do acervo (PR #5) foi desenhada em cima desse
recarregamento (o ponto viaja na URL).

**O que construir.**
1. Tirar os 4 iframes (areamod, pecas, legis, juris) de dentro dos `<sc-if>` e
   renderizá-los sempre, controlando visibilidade por variável de template no style
   (`display:{{ legisDisplay }}` etc.). `_montarFrames` continua pondo o `src` — mas
   agora só na PRIMEIRA vez que a view abre (lazy como hoje; iframe sem src não pesa).
2. Com o iframe vivo, o termo da ida e o ponto da volta deixam de viajar na URL entre
   trocas: o host passa a postar PARA DENTRO do iframe — `{type:'ctBusca', termo}`
   (legis/juris) e `{type:'ctAbrirBloco', rito, peca, bloco}` (ritos/pecas). As
   páginas ganham um listener que reusa a lógica que hoje lê `?q=`/`?peca=`
   (`ctBuscaInicial` e o bloco "volta do acervo" — extrair cada um para função e
   chamar dos dois lugares). Os parâmetros de URL CONTINUAM funcionando (primeira
   carga, deep-link, testes).
3. A pílula "← Voltar" passa a ser mostrada/escondida por mensagem
   (`{type:'ctVoltaDisponivel', on:true|false}`) em vez de `?volta=1`.

**Aceite.** Ritos → LEGIS → voltar: sem tela branca, busca e scroll preservados, bloco
destacado; os testes "ACERVO" de `tests/run.mjs` adaptados e verdes; trocar de área de
estudo ainda recarrega o iframe do módulo (o src muda de verdade nesse caso).

**Armadilhas.** Memória no iPad: 4 webviews vivas dentro do WKWebView — se pesar,
manter vivos só LEGIS/JURIS + módulo da área e deixar peças remontar. O
`legisFrameSrc` muda quando a área de estudo muda — `_montarFrames` já recarrega
quando `src` difere; preservar esse comportamento. Não deixar dois caminhos de busca
divergirem: URL e mensagem devem chamar A MESMA função.

## U2. Esqueleto de carregamento

**O que existe.** Iframe abre em branco até a página satélite pintar; telas pesadas do
host (relatório, acervos) montam de uma vez.

**O que construir.** Um fundo de esqueleto (retângulos pulsando em CSS puro, no padrão
visual da casa) atrás de cada iframe, visível até a página avisar `{type:'ctPronto'}`
(uma linha em cada satélite). Sem timer arbitrário; sem lib.

**Aceite.** Abrir LEGIS pela primeira vez mostra esqueleto → conteúdo, nunca branco.
**Armadilha.** O esqueleto só na PRIMEIRA carga; com U1 feito, as demais trocas são
instantâneas e não devem piscar esqueleto.

## U3. "Continuar de onde parei" na home

**O que existe.** O app não grava a última tela; o mecanismo `?rito=&peca=&bloco=`
(PR #5) já sabe reabrir um ponto exato; `_restoreProva`/`_restoreTimer` já retomam
simulado e cronômetro.

**O que construir.**
1. Chave escalar `catedra:lastPonto` (registrar em `_autosaveKeys`): gravar
   `{view, rito, peca, bloco, rotulo, ts}` a cada troca de view relevante (areamod,
   roteiros, legis, juris, redação, oral, 2ª fase) e nos eventos de acervo — um
   `setState` centralizado num helper `\_goView(v)` evita espalhar a gravação.
2. Cartão no topo do `inicio`: "Continuar: Rito ordinário — Sentença, bloco 4 · há 2h"
   com um botão que reusa `origemAbrir`/`acervoBusca` para reabrir o ponto. Se houver
   simulado pausado (`_restoreProva`), esse aviso tem prioridade no mesmo cartão.
3. Descartar com um ✕ (grava `lastPontoDispensado:ts` e some até haver ponto novo).

**Aceite.** Estudar um bloco, fechar o app, reabrir: o cartão leva ao bloco exato em
um clique; com simulado pausado, o cartão oferece retomá-lo.
**Armadilha.** `ts` sempre em ms e o cartão mostra idade relativa; entre aparelhos o
`lastPonto` sincroniza como escalar (carimbo por chave já resolve o conflito).

## U4. Retomada explícita de simulado e redação

**O que existe.** `_restoreProva` reabre o simulado pausado em silêncio;
`catedra:redText` guarda o rascunho da redação.

**O que construir.** Ao abrir a view de simulados com prova pausada, banner no topo:
"Simulado de ontem pausado — 12 questões restantes · Retomar / Descartar". Idem na
redação com rascunho não vazio ("rascunho de {data} — Continuar / Começar do zero",
começar do zero pede confirmação). O U3 aponta para cá.

**Aceite.** Nenhum estado pausado fica invisível; descartar zera de verdade.

## U5. Sincronização visível e honesta

**O que existe.** `auth.js` emite `catedra:syncstate`
(`local|enviando|salvo|offline|erro`); o app escuta num único ponto (~linha 5121) e
mostra pouco. O retry automático de 30s já existe (PR #6).

**O que construir.**
1. Selo permanente e discreto no rodapé da barra lateral (e no menu mobile):
   "✓ salvo às 00:42" / "↻ enviando…" / "⚠ sem conexão — suas alterações estão
   guardadas aqui" / "⚠ erro ao salvar — tentando de novo". Guardar o horário do
   último `salvo` em memória (não precisa persistir).
2. Se `erro` persistir por 5 minutos, o selo vira aviso clicável com o texto do
   problema e botão "tentar agora" (chama `window.CatedraSync.push()`).

**Aceite.** Estudando offline, o selo diz que está tudo guardado localmente; ao voltar
a conexão, vira "salvo" sozinho (o `online` listener já puxa e empurra).
**Armadilha.** Não usar o selo para bloquear nada — é informação, nunca trava.

## U6. Desfazer em vez de confirmar

**O que existe.** 8+ `confirm()` no host (linhas ~5941, 6283, 6419, 6970, 7400,
7980, 8331…) para exclusões; as lápides do sync (auth.js) já tratam recriação com o
mesmo id ("item recriado deixa de estar apagado").

**O que construir.** Helper único `\_excluirComDesfazer(rotulo, aplicar, reverter)`:
aplica na hora, mostra toast "{rotulo} excluído · Desfazer" por 6s (o `\_toast` da
casa, com botão). Migrar as exclusões de ITEM (sessão, flashcard, erro, meta, evento)
para ele. Manter `confirm()` só no destrutivo em massa (zerar tudo, sair da conta).

**Aceite.** Excluir uma sessão e desfazer restaura idêntica (mesmo id) e o sync não a
mata depois (lápide limpa na recriação — comportamento já garantido pelo auth.js).
**Armadilha.** `reverter` deve regravar o MESMO objeto com `up` novo, senão a lápide
do outro aparelho pode vencer.

## U7. Conforto de leitura

**O que existe.** `darkMode` manual, `prefs.fontScale` (normal/grande), `prefs.radius`;
os acervos (legis/juris) têm layout próprio de leitura.

**O que construir.** (a) Opção "tema automático" nos Ajustes: segue
`prefers-color-scheme` do sistema (uma media query + listener; manter manual como
override). (b) Nos acervos, um botão "modo leitura" no leitor de norma/verbete:
largura ~68ch, corpo serifado 17px+, entrelinha 1.7 — só CSS, persistindo a escolha
por aparelho (`localStorage` local dos iframes, sem sync).

**Aceite.** Sistema em modo escuro à noite → app acompanha; leitor de lei seca com
modo leitura lembrado entre aberturas.

## U8. Atalhos visíveis (tecla ?)

**O que existe.** ⌘K (paleta), Esc (fecha camadas), `/` (busca em pecas-web) — todos
secretos. O handler global é `_onKey` (~linha 4964).

**O que construir.** `?` (fora de input) abre um modal simples listando os atalhos —
gerado de uma constante única `ATALHOS=[{tecla,faz}]`, que também vira itens da
paleta ("Atalhos do teclado"). Novo atalho só entra somando na constante.

**Aceite.** `?` mostra o modal; Esc fecha; digitar `?` dentro de um input não abre.

## U9. Scroll único no iPad

**O que existe.** Os iframes têm altura `calc(100dvh - 180px)` (mobile) /
`calc(100vh - 108px)` (desktop) — a página satélite rola DENTRO do iframe enquanto o
host também pode rolar: duas barras brigando, pior no toque.

**O que construir.** Nas views de iframe, travar o scroll do host
(`overflow:hidden` no contêiner da view enquanto ela é um iframe de altura cheia) e
deixar só o scroll interno; conferir que topo/menu continuam alcançáveis. No mobile,
revisar o `-180px` contra o teclado virtual (usar `100dvh`, já usado, e testar com a
barra do Safari recolhida).

**Aceite.** No iPad, um dedo rolando o LEGIS nunca arrasta a página de trás junto.

## U10. PWA instalável e offline de verdade

**O que existe.** `manifest.webmanifest`, `sw.js` com stale-while-revalidate em
produção e kill-switch em dev (bem resolvido); ícones icon.svg/icon-180.

**O que construir.**
1. Conferir no sw.js que o precache cobre os acervos grandes (`juris-index.js`,
   `juris-text.js`, `leis-seca.js`, `oral-conteudo.js` etc.) e as páginas satélites —
   é o que torna o estudo offline completo.
2. Página/fallback offline decente para o que não estiver em cache.
3. Nos Ajustes, um item "Instalar no aparelho" com instrução por plataforma (iOS:
   Compartilhar → Tela de Início; Android/desktop: prompt `beforeinstallprompt`).

**Aceite.** Instalar no celular, ativar modo avião: home, revisões, acervos e roteiros
abrem; simulado funciona; o selo do U5 explica o estado.
**Armadilha.** O blob de contas (`contas-*.js`, 2,5 MB) é lazy — decidir
explicitamente se entra no precache ou fica só-online, e comentar a decisão no sw.js.

## U11. Registro de estudo em um toque

**O que existe.** O cronômetro da home e o modal completo de registro
(`catedraOpenStudyRegistration`); no Mac, o flush por rajada já pré-preenche.

**O que construir.** Ao pausar/zerar o cronômetro com ≥5 min acumulados, um toast-ação:
"Registrar 32 min em {última disciplina}? · Registrar / Editar / Ignorar" —
"Registrar" grava direto com disciplina e categoria da última sessão; "Editar" abre o
modal de sempre. Última disciplina vem de `catedra:sessions` (item mais recente).

**Aceite.** O caminho comum (estudou, pausou, registrar) cai para um toque; o modal
completo continua a um clique.

## U12. Lembrete de revisão no horário certo

**O que existe.** Revisões vencidas calculadas no host; shim de notificação nativa no
Mac (`notifShimJS` → UNUserNotificationCenter); chave `catedra:notifPush`;
`window.Notification` no site (permissão do navegador).

**O que construir.** Nos Ajustes: "Lembrar revisões às HH:MM" (padrão desligado). Com
o app aberto, um verificador por minuto dispara UMA notificação/dia se houver revisão
vencida ("12 revisões esperando — 15 min resolvem"), via `Notification` (no Mac cai no
shim nativo sozinho). Registrar o dia do último aviso (`catedra:notifRevDia`) para não
repetir.

**Aceite.** Com horário configurado e revisões vencidas, a notificação chega uma vez ao
dia; clicar leva à view de revisões (`window.__catedraGoView('revisoes')` já existe).
**Armadilha.** Sem serviço de push de servidor, o lembrete só dispara com o app
aberto/minimizado — dizer isso honestamente no texto do Ajuste.

## Ordem sugerida da Parte 2

`U5 → U6 → U3 → U4 → U1 → U2 → U9 → U8 → U7 → U11 → U10 → U12` — U5/U6 são pequenos e
pagam confiança imediata; U1 é o maior ganho, mas mexe na estrutura das views (fazer
com calma, num PR só dele); U10/U12 fecham o ciclo mobile.

---
---

# Parte 3 — Interface e design

Baseada em screenshots reais das páginas renderizadas (ritos, roteiro de peça, LEGIS,
JURIS, roteiros, 2ª fase, mobile). O design de base é bom — cards consistentes,
respiro, cor por ramo; os itens abaixo são lapidação. Ao validar qualquer um deles,
renderize a página no Chromium headless e compare o antes/depois (o servidor estático
de `tests/run.mjs` serve de base para um script de screenshot).

## D1. Tema único: satélites herdam cor, modo escuro e fonte do host

**Problema visto.** Cada satélite tem paleta própria fixa: ritos e 2ª fase em vinho
(`#b5174e`), LEGIS/JURIS em verde (`#0f7a57`) — e nenhum respeita a cor de destaque
escolhida nos Ajustes nem o modo escuro: com o host escuro, os iframes seguem claros
(flash branco ao trocar de tela).

**O que existe.** A ponte de tema já funciona para UM caso: o iframe do checklist
posta `ctChecklistReady` e o host responde `{type:'ctTheme', tokens:{--bg, --accent,
--ink, …}}` (handler `_ckMsg` no `componentDidMount`). Todos os satélites já usam CSS
vars com fallback (`var(--accent,#0f7a57)`).

**O que construir.** Generalizar: cada satélite posta `{type:'ctPronto'}` ao carregar
(o mesmo aviso do U2/esqueleto); o host responde com os tokens atuais e REENVIA quando
o tema muda (accent, dark, fontScale). O satélite aplica com
`document.documentElement.style.setProperty` — como as páginas já usam vars com
fallback, standalone continua com a cara própria. Renomear o handler `_ckMsg` para
genérico e manter compatibilidade com `ctChecklistReady`.

**Aceite.** Host em modo escuro → LEGIS/JURIS/ritos/2ª fase escuros; trocar a cor de
destaque muda todas as telas; página aberta avulsa (sem host) mantém a paleta atual.
**Armadilha.** Contraste: os tokens do host já calculam `--onAccent`; usar os tokens
prontos, nunca derivar cor no satélite.

## D2. Modo embutido (?embed=1): sem cabeçalho duplicado

**Problema visto.** Cada satélite traz logo + título grande ("CátedraLEGIS", "Ritos
processuais") dentro do app que já mostra onde a pessoa está — ~120px verticais
repetindo identidade em toda tela.

**O que construir.** Parâmetro `?embed=1` (o host acrescenta aos `src` dos iframes):
o satélite compacta o header — some o ícone/logo grande, o título vira uma linha fina
com as ações (Notas/Imprimir) à direita. Standalone (sem o parâmetro) fica como está.

**Aceite.** Dentro do app, o conteúdo começa ~100px mais alto em todas as satélites;
abrir a página direto pela URL mantém o header completo.

## D3. JURIS: filtros rotulados e recolhidos

**Problema visto.** Três fileiras de chips antes do conteúdo, com identificador
técnico cru vazando na interface: `informativo_stj`, `sel_tjgo`, `repercussao_geral`,
`juris_em_teses`, `controle_const`…

**O que construir.** (a) Mapa de rótulos num só lugar (`{informativo_stj:'Informativo
STJ', sel_tjgo:'Seleção TJGO', …}`) aplicado nos chips — o valor interno não muda.
(b) Recolher as fileiras de coleções e ramos num botão "Filtros (2)" que abre popover;
tribunais continuam visíveis. Filtro ativo aparece como chip removível ao lado do
botão.

**Aceite.** Nenhum snake_case visível; o acervo aparece na primeira dobra; filtros
ativos visíveis e removíveis com um toque.

## D4. Estados vazios que convidam (fim dos zeros)

**Problema visto.** LEGIS abre com "0 DOMINADAS · 0 LENDO · 0 FAVORITAS" em destaque
— contabilidade do nada; JURIS idem ("0 dominados · 0 favoritos").

**O que construir.** Métrica zerada não vira número: o slot mostra convite curto
("marque ★ nas leis do seu edital" / "✓ quando dominar uma lei"). Com ≥1, vira número
normal. Vale para qualquer painel de estatística da casa: zero absoluto = convite.

## D5. Catálogo do LEGIS: linha clicável, um botão só

**Problema visto.** 268 leis × 2 botões verdes de mesmo peso ("Ler aqui" +
"Planalto") = 536 botões; a ação primária não se distingue.

**O que construir.** A linha inteira abre o leitor (ação primária; cursor pointer +
hover no card); "Planalto ↗" vira link discreto (texto pequeno, sem borda), e a ★ de
favorito ganha `aria-label`. Manter a área de toque da linha ≥44px.

## D6. Fluxograma: losango, rótulos de seta e contraste

**Problema visto.** O texto da decisão vaza do losango ("Legitimidade" + a lei
escapam da forma); os rótulos das setas (ENTE LESADO / MINISTÉRIO PÚBLICO) estão em
cinza claro pequeno — baixo contraste na informação que diferencia os caminhos.

**O que construir.** (a) Losango: conteúdo com `max-width` e o shape crescendo com o
texto (ou texto FORA do losango, abaixo, como legenda — mais simples e legível).
(b) Rótulos de seta: subir o contraste para ≥4.5:1 (usar `--text2` em vez de
`--text3`) e leve fundo pill para descolar da linha.

## D7. Microlabels mono com hierarquia

**Problema visto.** "NOTA", "O QUE MANDA", "COMO ISSO VAI PARA A FOLHA", "BANCA
PRÓPRIA", "FLUXO" — o mesmo tratamento mono-caps-espaçado em tudo; quando tudo
destaca, nada destaca.

**O que construir.** Definir DOIS níveis e aplicar: nível forte (mono caps + cor do
ramo) só para o que estrutura a leitura (NOTA, seções); nível fraco (caps menor,
`--text3`, sem espaçamento extra) para metadados (BANCA PRÓPRIA, contagens). Passar
um pente nos satélites trocando classe — sem redesign.

## D8. Mobile: toque e pílulas

**Problema visto.** Pílulas de rito cortadas no meio ("Ambienta…"), alvos de toque do
topo < 44px, "Imprimir" ocupando lugar nobre no celular.

**O que construir.** No breakpoint móvel: alvos ≥44px; a fileira de pílulas com
scroll-snap e a pílula ativa sempre visível (`scrollIntoView` já existe no clique —
falta no load); "Imprimir" e "Notas" recolhem num menu "⋯". Conferir o mesmo padrão
nas demais satélites.

## D9. Build sem CDN: falhar em vez de degradar

**Problema visto (de verdade: foi o que impediu o app de abrir no ambiente de
teste).** Quando o vendoring do React falha no build, `scripts/build.mjs` publica o
site apontando para `cdn.jsdelivr.net`/`unpkg.com` — numa rede que bloqueia CDNs
(faculdade, tribunal, sandbox), o app não abre. O supabase-js idem.

**O que construir.** No `build.mjs`: vendoring que falha = **build falha** (exit 1)
com mensagem clara, em vez de cair para CDN. Manter o fallback só atrás de uma flag
explícita (`CT_PERMITE_CDN=1`) para debug. Vendorar também o supabase-js. A fonte
Inter (Google Fonts) entra no mesmo tratamento: baixar no build para `public/fonts/`
com `font-display:swap` — resolve também o offline do U10.

**Aceite.** `node scripts/build.mjs` num ambiente sem rede externa: ou o build já tem
os arquivos vendorados (cache no repo/CI) e passa, ou falha ruidosamente — nunca
publica dependendo de terceiro. O site abre com todas as fontes/scripts servidos do
próprio domínio.

## D10. Acessibilidade mínima dos satélites

**O que construir.** Uma passada única: `aria-label` em todo botão só-ícone (★, ✕,
setas, ⋯); foco visível (outline com `--accent`) em chips e pills; contraste dos
subtítulos `--text3` (#7d7a86 sobre #faf7f5 fica no limite) — subir um degrau onde o
texto for < 13px. Teste em `tests/run.mjs`: nenhuma página com botão sem nome
acessível (checagem simples via `document.querySelectorAll('button')` sem
texto/aria-label).

## Ordem sugerida da Parte 3

`D9 → D1 → D2 → D3 → D5 → D4 → D7 → D6 → D8 → D10` — D9 é risco real de
disponibilidade (primeiro); D1+D2 mudam a percepção do app inteiro de uma vez; o
resto é polimento por tela e pode ir num único PR de "pente fino visual".
