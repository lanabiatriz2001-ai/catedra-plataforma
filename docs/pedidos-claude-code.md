# Pedidos para o Claude Code — Cátedra

*Arquivo único, escrito em 02/09/2026. Cada bloco "Prompt" abaixo é para colar no Claude
Code, na ordem, um por vez. Marque a caixa quando o PR estiver commitado e testado.
Referências de linha são do estado do repositório em 02/09/2026 — o Code deve confirmar
com `grep` antes de editar.*

---

## Como usar

1. Abra o Claude Code na pasta `~/catedra-plataforma-main`.
2. Cole primeiro o **Prompt 0** (contexto). Depois, um pedido por sessão, do P1 em diante.
3. Depois de cada PR: `npm test` verde (Chromium) e `npm run test:webkit` verde. Você instala
   no Mac e no iPad (`mac/build-app.sh`, `ios/build-ipad.sh`) — o Code não faz isso.
4. O que está em **"Decisões minhas"** no fim não é pedido ao Code: é o que só você decide.

---

## Prompt 0 — contexto (colar no início de toda sessão)

```
Você vai trabalhar no repositório da Cátedra (plataforma de estudos para magistratura).
Antes de qualquer edição, leia nesta ordem: PRODUCT.md, DESIGN.md,
docs/especificacao-melhorias.md (só a seção "Regras da casa"), docs/roadmap.md e o arquivo
docs/pedidos-claude-code.md. Rode `npm test` (CT_CHROME apontando para o Chrome do Mac) e
`npm run test:webkit` para conhecer a linha de base antes de mexer.

Regras invioláveis:
- Estado novo entra em `_autosaveKeys()` (Catedra.dc.html ~linha 7036); array de objetos
  tem `id` único e `up` (ms) e entra em `ARRAY_ID` (auth.js linha 168).
- Arquivo novo entra nas listas de cópia de scripts/build.mjs e scripts/build-macos.mjs.
- Nada de rede externa em runtime, nada de CDN, nada de fonte externa (app roda offline e
  em file:// no iPad/Mac; WKWebView usa JavaScriptCore — evitar sintaxe muito nova).
- Sync: nunca sobrescrever trabalho da pessoa; preservar as travas existentes do auth.js.
- Design: tokens sempre (nada de hex fixo, nada de px no host), sem faixa colorida
  lateral, sem emoji em elemento novo, cor-texto ≠ cor-identidade (≥ 4,5:1), alvos ≥ 44px,
  prefers-reduced-motion respeitado.
- Cada item é um PR com casos novos em tests/run.mjs; mensagens de commit em português,
  em uma frase que diz o que mudou para a pessoa (padrão do `git log`).
- Não instale nos aparelhos nem mude versões de dependências sem eu pedir.
- Português do Brasil com acentuação completa em código, comentários e interface.
Quando terminar um item, liste: arquivos alterados, casos de teste novos, o que ficou
pendente e o que eu preciso decidir.
```

---

## Bloco A — Fechar o que já está pronto (só commitar e conferir)

### P1 · Commitar as entregas de 02/09
- [ ] `docs/especificacao-leitura-ativa.md`, `docs/especificacao-trilha-enam.md`
- [ ] `docs/juridico/termos-de-uso.md`, `docs/juridico/politica-de-privacidade.md`
- [ ] `tests/_infra.mjs`, `tests/oral-lei-seca.mjs`, `tests/run-webkit.mjs`, `tests/run.mjs`,
      `package.json`, `.github/workflows/testes.yml`

```
Confira `git status`. Rode `npm test` e `npm run test:webkit`. Se ambos passarem, faça
dois commits: (1) "Especificações da leitura ativa e da trilha ENAM, e os rascunhos
jurídicos entram no repositório" com docs/; (2) "A suíte ganha o WebKit como motor e um
teste para a aba Lei seca da Prova oral" com tests/, package.json e o workflow. Não
altere o conteúdo dos arquivos. Se algum teste falhar, pare e me mostre a saída.
```

### P2 · Levar o teste WebKit ao bundle do iPad
- [ ] `tests/run-webkit.mjs` também abre `mac/build/web/index.html` em `file://`

```
Em tests/run-webkit.mjs, acrescente uma terceira origem: se existir mac/build/web/index.html
(gerado por scripts/build-macos.mjs), rode testarOralLeiSeca também nesse arquivo em
file://, rotulando as asserções com [bundle]. O bundle não leva a pasta dados/ — então o
caminho testado é o fallback por <script> para leis-seca.js, exatamente o que o iPad usa.
Se o teste falhar aí, NÃO afrouxe a asserção: investigue treino.js (acervoLeis,
carregarScript) e ct-dados.js e me traga a causa com o valor de catedra:_lastErr.
```

---

## Bloco B — Motor de leitura ativa (docs/especificacao-leitura-ativa.md)

Ordem: LA1 → LA2 → LA4 → LA5 → LA3 → LA6. Um PR por item.

### P3 · LA1 — modelo de dados e canal
- [ ] `leitura-ativa.js` (`window.CT_LA`, funções puras), `catedra:leituras` em
      `_autosaveKeys` e `ARRAY_ID`, mensagens `ctLeiturasPedir`/`ctLeituras`/
      `ctLeituraAtiva`/`ctLeituraConferida` em `_acervoMsg`, build lists, harness

```
Implemente o item LA1 de docs/especificacao-leitura-ativa.md exatamente como escrito:
crie leitura-ativa.js na raiz com CT_LA.ELEMENTOS, nova, marcar, desmarcar, naoHa, hash,
completude, cloze (assinatura pronta, corpo em LA5), conferir (assinatura pronta, corpo em
LA4) e progresso; registre `leituras` em _autosaveKeys e 'catedra:leituras' em ARRAY_ID;
adicione os quatro handlers de mensagem em _acervoMsg (Catedra.dc.html ~linha 6288),
com o host como fonte da verdade e upsert preservando o `up` maior; inclua o arquivo nas
listas de scripts/build.mjs (casca) e scripts/build-macos.mjs; carregue-o em
legis-web.html ao lado de tema-satelite.js. Crie tests/harness-leitura-ativa.html e os
casos LEITURA de marcar/naoHa/completude/hash em tests/run.mjs, mais o caso de sync em
tests/sync-fixture.html para catedra:leituras. Nenhum texto de lei pode entrar em
catedra:leituras.
```

### P4 · LA2 — a grade no leitor do LEGIS
- [ ] 14 tokens `--la-*`/`--la-*-tx` em `catedra-ui.css` + ponte D1 (`tema-satelite.js`
      linha 27 e host ~linha 6165), interruptor "Leitura ativa", trilho de 7 chips por
      dispositivo, seleção → elemento, legenda, teclas 1–7 e 0, alvos 44px

```
Implemente o item LA2 de docs/especificacao-leitura-ativa.md em legis-web.html e
catedra-ui.css. Os 7 tokens de identidade e os 7 de texto entram em catedra-ui.css e nas
duas listas da ponte D1. O trilho de chips fica abaixo de cada .gr quando o interruptor
está ligado; a barra _grif (mouseup, legis-web.html ~linha 731) ganha os 7 chips; as
marcas viram <mark class="la la-<el>" data-el data-s> renderizadas na mesma passada de
renderGr que os grifos livres. Rótulo escrito em todo chip e lacuna — nunca cor sozinha.
Crie um script irmão de scripts/verificar-cores-ramo.mjs que mede o contraste dos 14
tokens em claro/escuro e aborta o build abaixo de 4,5:1 no texto e 3:1 na identidade.
Estenda o teste D1/TASK9 para conferir que --la-quem e --la-proibicao-tx chegam ao iframe.
```

### P5 · LA4 — conferência imediata e "erro como filtro"
- [ ] painel `.la-conferencia`, botões Errei/Hesitei/Acertei (q 1/3/5),
      `CT_LA.conferir`, `ctLeituraConferida` → `catedra:fc` + `catedra:reviews`
      (id `rv|la|…`) + `catedra:errors`, toast com desfazer

```
Implemente o item LA4 de docs/especificacao-leitura-ativa.md. Regra central: q=5 não cria
nada; q=3 cria flashcard e revisão; q=1 cria flashcard, revisão e item no caderno de
erros. A revisão usa id determinístico rv|la|<leituraId>|<el> e, se já existir, aplica
sm2(r, q) em vez de duplicar; flashcards repetidos são barrados por hash do front em 30
dias; teto de 20 por mensagem com aviso do restante; toast da casa com "desfazer" que
remove os ids do lote (sem window.confirm). Casos de teste: 4 marcas → 2 Acertei, 1
Hesitei, 1 Errei geram exatamente 2 fc, 2 reviews e 1 erro; desfazer limpa os 5.
```

### P6 · LA5 — cloze de lei seca
- [ ] `CT_LA.cloze`/`renderCloze`, cartão `tipo:'cloze'` com `extra`, exportação Anki em
      arquivo próprio (modelo Cloze), aviso de revogado/vetado

```
Implemente o item LA5 de docs/especificacao-leitura-ativa.md: CT_LA.cloze gera front na
sintaxe do Anki ({{c1::…}}, no máximo 3 lacunas, um elemento por cartão, texto-base pela
mesma regra de CT_TREINO.proposicoesDoArtigo), back com o trecho em destaque e extra com
"sigla · rot · rótulo da pergunta" + explicação curta por regra (sem IA) + alerta só se
CT_TREINO.inverter identificar termo trocável. exportFlashcardsCSV (Catedra.dc.html
~linha 5535) passa a separar os cartões tipo:'cloze' em catedra-cloze-lei-seca.txt (TSV
front[TAB]extra) com a nota "importe como tipo de nota Cloze e permita HTML". renderCloze
é usado na conferência e no revReveal da sessão "Revisar agora". Escape de {{ literais.
Caso de teste: CC art. 1.239, elemento prazo → front com {{c1::cinco anos}}.
```

### P7 · LA3 — modo guiado (um dispositivo, uma pergunta por vez)
- [ ] bancada `.la-guiado` (foco/apoio/fila), fluxo 1→7 com "Não há" e "Pular", `Esc`
      volta ao documento, toque por palavra no iPad, voz opcional por `speechSynthesis`,
      zero estímulo

```
Implemente o item LA3 de docs/especificacao-leitura-ativa.md em legis-web.html usando a
gramática de bancada do DESIGN.md (.ct-bc-foco/.ct-bc-apoio/.ct-bc-fila). O documento
fica visibility:hidden (não display:none) enquanto o modo está ativo. No foco, o texto do
dispositivo é renderizado por palavra (<span class="la-pal">) para seleção por toque no
iPad; a marca cai no elemento da pergunta em foco sem escolher cor. Teclado completo:
1–7, 0 (não há), Enter, Esc. Sem cronômetro, ofensiva, confete ou toast de celebração;
transições só de opacity ≤ 150 ms e nenhuma com prefers-reduced-motion. Filtros "só
incidência alta" (carregarIncidencia, ~linha 271) e "só o que ainda não li"
(CT_LA.progresso). Acrescente ao tests/run-webkit.mjs um roteiro: abrir o LEGIS, ligar
leitura ativa, entrar no modo guiado e marcar por toque de palavra.
```

### P8 · LA6 — a grade reaparece no oral, no simulado e no registro
- [ ] trilho só-leitura na aba Lei seca da Prova oral + "Ler ativamente no LEGIS";
      "Conferir de novo" no gabarito do simulado; registro de sessão pré-preenchido
      (`Lei seca`); barra "lido ativamente" no catálogo; fator novo (5%) na prioridade

```
Implemente o item LA6 de docs/especificacao-leitura-ativa.md. Casamento de dispositivo:
CT_LEIS.url ↔ leiId e rot normalizado (º/o, espaços, travessões). O host não carrega
leis-seca.js por causa disto no LEGIS — só o host tem CT_LEIS. Na aba Lei seca do oral
(template ~linha 3027) e no gabarito de item origem:'lei' do simulado, mostrar o trilho
quando existir leitura e os botões "Ler ativamente"/"Conferir de novo" pelo canal
ctAbrirAcervo. Ao sair do modo guiado com ≥ 1 dispositivo lido, oferecer "Registrar
sessão" pré-preenchida (categoria Lei seca) respeitando o interruptor de Ajustes. Fator
"incidência alta ainda não lida" com peso 5% na constante única de prioridade-calc.js.
```

---

## Bloco C — Trilha ENAM (docs/especificacao-trilha-enam.md)

Ordem: E2 → E1 → E3 → E4 → E5. Pode andar em paralelo ao Bloco B.

### P9 · E2 — banco oficial das provas do ENAM
- [ ] `scripts/build-questoes-enam.mjs` → `questoes-enam.js` (`window.CT_QUESTOES_ENAM`),
      PDFs em `scripts/fontes/enam/`, portão de qualidade, `acervoQuestoesEnam()` em
      `treino.js`, lista "sob pedido" do build

```
Implemente o item E2 de docs/especificacao-trilha-enam.md. Fonte: prova (tipo 1) e
gabarito definitivo oficiais das edições I (abr/2024), II (out/2024), III (mai/2025),
IV (out/2025) e V (jun/2026), publicados pela FGV/ENFAM; baixe uma vez para
scripts/fontes/enam/ (versionado) e gere questoes-enam.js com o shape da especificação
(id, edicao, numero, area, disciplina, enunciado, alternativas A–E, gabarito, anulada,
fonte). A área vem do cabeçalho do bloco da prova, não do texto. Constante CT_ENAM.AREAS
em enam.js com cota por edição (2026.2: 16/10/6/6/12/12/6/12 — Edital 02/2026, item 8.6).
Portão de qualidade: abortar se alguma edição ≠ 80 questões, id duplicado, ≠ 5
alternativas, gabarito fora de A–E, mojibake (reuse scripts/qualidade-texto.mjs) ou
enunciado < 40 caracteres. Nunca copiar comentário de terceiros. Casos de teste com PDF
de amostra em tests/. Me diga quantas questões ficaram anuladas por edição.
```

### P10 · E1 — calendário, meta e contagem regressiva
- [ ] `catedra:enam` em `_autosaveKeys`, Ajustes → "ENAM" (edição, meta 56/40 como
      número), chip no Início, régua com duas datas, `CT_ENAM.diasAte`/`cadencia`

```
Implemente o item E1 de docs/especificacao-trilha-enam.md. Data 29/11/2026 às 13h no fuso
America/Sao_Paulo (a pessoa está em UTC−4: mostrar "12h em Porto Velho" via Intl com o
fuso do aparelho). Meta de acertos como dois botões neutros — "56 acertos (70%)" e "40
acertos (50%)" — guardando só o número; nenhum campo de raça, etnia ou deficiência. A
régua do Edital/Reta final aceita duas datas; a mais próxima manda. Estado vazio convida
("Vai fazer o ENAM? Ative a trilha"). Casos: diasAte em 02/09 → 88; 28/11 23h30 em UTC−4
→ 1; cadência 02/09→29/11 = 6 datas (13/09, 27/09, 11/10, 25/10, 08/11, 22/11).
```

### P11 · E3 — simulado no formato da prova
- [ ] preset "Modo ENAM" no Simulado, `CT_ENAM.montar`, cronômetro 300 min via
      `provaMode`, `ct_enam_prova` (retoma a mesma prova por até 36 h), grade de 80
      quadradinhos, sem correção imediata, teclado A–E/←/→/R

```
Implemente o item E3 de docs/especificacao-trilha-enam.md reaproveitando iniciarSj/
responderSjAlt/sjItens (Catedra.dc.html ~linhas 9840–9890) e provaMode/_saveProva/
_restoreProva (~11134–11146). Só CT_QUESTOES_ENAM não anuladas, na ordem das áreas do
edital, cotas exatas; estoque curto completa com CT_QUESTOES_PROVA da mesma disciplina
marcado foraDoEnam:true — nunca com itens C/E gerados. Persistência própria
ct_enam_prova {itensIds, resp, atual, ini} por até 36 h, sem mexer na regra do ct_prova
comum. Avisos aos 60 e 15 minutos finais, discretos, sem som. Caso de teste: responder 3,
recarregar, mesma prova e mesmas respostas; exitProva limpa ct_enam_prova.
```

### P12 · E4 — correção "habilitaria?" e erros que viram revisão
- [ ] `CT_ENAM.corrigir`, tela de resultado por área com alvo proporcional,
      `catedra:enamSim` em `_autosaveKeys` + `ARRAY_ID`, erros pelo canal do item 2
      (teto 20, desfazer), gabarito com referência normativa

```
Implemente o item E4 de docs/especificacao-trilha-enam.md. corrigir(itens, resp, meta)
devolve acertos, brancos, erros, habilitaria, margem, porArea com alvo = cota × meta/80 e
deficit, tempo médio por questão (só respondidas). Texto da tela: "habilitaria" ou
"faltaram N acertos" em --warn (nunca --danger). Anulada não conta. Histórico em
catedra:enamSim sem enunciados (só ids e respostas). Erros → catedra:errors e flashcard
enunciado → gabarito + referência, teto 20, dedupe por hash, toast com desfazer. Casos:
51/80 com meta 56 → false, −5; com meta 40 → true, +11.
```

### P13 · E5 — painel da trilha ENAM no Início
- [ ] bloco "Trilha ENAM", sparkline SVG inline das tentativas, 8 áreas com `ok/cota`,
      cadência com "Colocar na agenda" (`catedra:eventos`), "Importar o edital ENAM",
      próxima ação dinâmica, estado vazio

```
Implemente o item E5 de docs/especificacao-trilha-enam.md como bloco modular do Início,
visível só com catedra:enam.ativo. Sem "atrasado" em --danger, sem ofensiva: cadência é
sugestão. Se provaData (concurso estadual) estiver a menos de 30 dias, a Reta final manda
e o bloco recua para "sem simulado nesta semana". Estado vazio mostra o formato da prova
(80 · 5 h · 56/40) e o botão "Fazer o primeiro simulado" — nunca zeros.
```

---

## Bloco D — Virar produto (as lacunas que impedem gente de fora entrar)

### P14 · Termos e privacidade dentro do app
- [ ] `scripts/build-juridico.mjs` (md → html sem dependência) gera `termos.html` e
      `privacidade.html`; link no portão de login e em Ajustes; aceite versionado
      `catedra:aceite {versao, ts}` em `_autosaveKeys`; modal de consentimento
      específico da IA na primeira vez, revogável em Ajustes; exclusão de conta pela
      própria pessoa com exportação antes

```
A partir de docs/juridico/termos-de-uso.md e docs/juridico/politica-de-privacidade.md,
crie scripts/build-juridico.mjs (conversor Markdown→HTML mínimo, sem dependência externa,
com os tokens do design) que gera termos.html e privacidade.html no build e nas listas de
cópia. No portão de login (auth.js) e em Ajustes, links para as duas páginas. Aceite dos
termos versionado em catedra:aceite {versao, ts} (registrar em _autosaveKeys): sem aceite
da versão vigente, o app pede antes de sincronizar. Antes do primeiro uso de qualquer
recurso de IA, modal de consentimento específico com este texto: "Este recurso envia o
texto abaixo a provedores de IA fora do Brasil (Anthropic, Google ou OpenAI) apenas para
gerar a resposta; não é usado para treinar modelos. Não inclua dados de terceiros. Você
pode desativar a IA em Ajustes." — guardar catedra:iaConsentimento {versao, ts}; sem ele,
/api/complete e /api/tts não são chamados. Verifique se existe exclusão de conta pela
própria pessoa em Ajustes; se não, crie: exporta JSON antes, apaga dados na nuvem
(Supabase) e locais, remove apelido e mensagens de grupos. Não altere o texto dos
documentos jurídicos.
```

### P15 · Página pública e lista de espera
- [ ] `sobre.html` (o que é, para quem, como funciona, sem promessa de aprovação, sem
      depoimento inventado), formulário de e-mail → tabela Supabase `lista_espera`
      (insert anônimo com RLS, sem leitura pública), `vercel.json` rota `/sobre`, link
      "Conhecer a Cátedra" no portão de login

```
Crie sobre.html: página pública estática com os tokens do design (direção "vitrine"),
explicando a Cátedra para concurseiros de magistratura — leitura ativa da lei em 7
perguntas, espelhos oficiais quesito a quesito, prova oral com arguição, funciona
offline — sem promessa de aprovação e sem depoimentos, números de adoção ou preço (não
existem; PRODUCT.md proíbe inventar). Formulário de lista de espera (e-mail + área de
interesse) gravando na tabela Supabase lista_espera via chave anônima, com política RLS
que permite só INSERT e impede leitura; validação de e-mail; mensagem de sucesso sem
redirecionar. Rota /sobre em vercel.json e link "Conhecer a Cátedra" no portão de login.
Inclua sobre.html nas listas do build. Teste: o formulário rejeita e-mail inválido e o
INSERT anônimo funciona; SELECT anônimo é negado.
```

### P16 · Modo baixa estimulação e acessibilidade restante
- [ ] interruptor em Ajustes (`prefs.baixaEstimulacao`) esconde ofensiva, escudos,
      confete, ranking, desafio da semana e emojis decorativos; `aria-label` nos selects;
      chips a 44px; cor-texto separada da cor-identidade nos ~6 consumidores de `_corDisc`

```
Crie em Ajustes o interruptor "Baixa estimulação" (prefs.baixaEstimulacao, já coberto
por prefs em _autosaveKeys): ligado, o app esconde ofensiva/streak, escudos, confete,
ranking e desafio da semana da Comunidade, toasts de celebração e os emojis decorativos da
interface (fogo, alvo, confete, brilho e aceno — localize-os por faixa Unicode no
Catedra.dc.html), mantendo toda a funcionalidade e os dados. Nenhum elemento
novo usa emoji (DESIGN.md). Feche os itens de acessibilidade do roadmap: aria-label em
todos os selects sem rótulo, chips com alvo ≥ 44px no iPad, e a separação cor-identidade
(gráficos, ≥ 3:1) × cor-texto (≥ 4,5:1) nos consumidores textuais de _corDisc (achado 2
do code review de 21/08). Teste: com o interruptor ligado, nenhum dos elementos listados
está no DOM visível; contraste medido pelo script de cores.
```

### P17 · Medição e monitoramento sem terceiros
- [ ] `catedra:_lastErr` também vai para a tabela Supabase `erros_cliente` (sem dados
      pessoais, com versão do build, alvo e tela); contadores de uso por tela em
      `uso_telas` agregados por dia; painel no console de administração; política de
      privacidade atualizada se algum dado novo for tratado

```
Implemente telemetria de primeira parte, sem serviço de terceiros: (1) quando o app grava
catedra:_lastErr, envie também para a tabela Supabase erros_cliente {build, alvo, tela,
mensagem sem dados pessoais, ts}, só se houver rede e só para conta logada, com fila local
para offline; (2) contagem de aberturas por tela agregada por dia em uso_telas (sem
identificar a pessoa: só contador por conta e dia); (3) bloco no console de administração
listando os erros das últimas 24 h e as telas mais usadas. RLS: a pessoa insere só o que é
dela; só a administração lê. Me diga exatamente quais dados novos passam a ser tratados
para eu atualizar a política de privacidade antes de ligar isto em produção.
```

### P18 · Cota de IA por pessoa e por plano
- [ ] `api/complete.js` e `api/tts.js`: cota diária por usuário lida de uma tabela
      `ia_cota` (padrão beta: N chamadas/dia), mensagem clara ao estourar, contagem
      já existente reaproveitada, kill switch mantido

```
Em api/complete.js e api/tts.js, acrescente cota diária por usuário: leia o limite de uma
tabela Supabase ia_cota (coluna por plano; padrão beta configurável pelo console de
administração) e conte as chamadas do dia com o registro que já existe; ao estourar,
responda 429 com mensagem em português que o app mostra em toast ("Você usou as N
chamadas de IA de hoje; volta amanhã ou fale com quem te convidou"). Mantenha allowlist,
kill switch e teto por chamada como estão. Teste da função com mock do fetch.
```

### P19 · Foco de escopo para o beta público
- [ ] constante `CT_AREAS_PUBLICAS` (só `juridica` no beta) escondendo as áreas saúde,
      social e policial do onboarding e dos Ajustes sem apagar código nem dados

```
Crie a constante CT_AREAS_PUBLICAS em area-registry.js (valor inicial ['juridica']) e faça
onboarding, Ajustes e o seletor de área respeitarem-na: áreas fora da lista não aparecem
para contas novas, mas contas que já as usam continuam funcionando. Nenhuma remoção de
código ou de dados. Teste: com a lista ['juridica'], o onboarding oferece só a área
jurídica; com a lista completa, tudo volta.
```

### P20 · Peso inicial e primeira impressão
- [ ] medir com Lighthouse (4G simulado) o primeiro carregamento do host e do LEGIS;
      relatório antes de qualquer mudança; depois, esqueleto de carregamento (U2) e
      estados vazios que convidam (D4) da especificação anterior

```
Primeiro meça, sem mudar nada: rode Lighthouse (modo mobile, 4G simulado) contra
public/index.html servido localmente e relate LCP, TBT, transferência total e os cinco
maiores arquivos carregados no boot. Só depois, e em PR separado, implemente U2
(esqueleto de carregamento) e D4 (estados vazios que convidam, com título, descrição e
ação) de docs/especificacao-melhorias.md, começando pelas telas que a pessoa nova vê
primeiro: Início, Edital, Simulado e LEGIS.
```

---

## Ordem e calendário sugeridos

| Semana | Pedidos | Por quê |
|---|---|---|
| 1 | P1, P2, P3, P9 | commitar o pronto; modelo de dados da leitura e banco ENAM andam em paralelo (o banco é só script) |
| 2 | P4, P10 | a grade aparece; a contagem para 29/11 aparece |
| 3 | P5, P6, P11 | erro vira cartão; simulado no formato |
| 4 | P7, P12 | modo guiado; correção "habilitaria?" |
| 5 | P8, P13, P14 | grade nos outros lugares; painel ENAM; termos e consentimento no app |
| 6 | P15, P16 | página pública e lista de espera; baixa estimulação e a11y |
| 7 | P17, P18, P19, P20 | telemetria, cota de IA, foco de escopo, peso inicial |

Marcos externos: inscrições do ENAM 2026.2 até 24/09; prova em 29/11 (resultado previsto
para fevereiro/2027); ciclo 2027.1 com edital previsto para março e prova para junho
(projeção pelo padrão de 2026.1).

---

## Decisões minhas (o Code não decide)

- [ ] **Controlador dos dados**: pessoa física por enquanto ou constituir a sociedade
      limitada com administrador que não seja eu (LC 68/1992, art. 155, X; LOMAN, art.
      36, I e II; CF, art. 95, parágrafo único, I). Preencher `controlador`, `cnpjCpf` e
      `endereco` em **`docs/juridico/controlador.json`** — é o único lugar; os .md não se
      editam para isso. Enquanto faltar algum campo, as páginas saem carimbadas "rascunho".
- [ ] **Encarregado (DPO)**: quem é e qual e-mail (`emailEncarregado` no mesmo JSON), lido de
      verdade — é o canal dos direitos do art. 18 da LGPD, com resposta em 15 dias (art. 19).
      E `emailContato`, o e-mail geral dos Termos.
- [ ] **Prazos** (`prazos` no mesmo JSON, só números): retenção da contagem de IA e da
      auditoria (12 meses?), exclusão da nuvem após encerrar conta (30 dias?), aviso prévio de
      encerramento da plataforma (30 dias?), aviso de mudança nos documentos (15 dias?). Vazio
      mantém a proposta entre colchetes no texto.
      Depois de preencher: `node scripts/build-juridico.mjs` e commit dos três gerados.
- [ ] **Meta do ENAM** (56 ou 40) e **datas dos simulados** (a cadência propõe 13/09,
      27/09, 11/10, 25/10, 08/11 e 22/11).
- [ ] **Marca**: busca de colidência de "Cátedra" no INPI (classes 41 e 42; Lei
      9.279/1996, arts. 122 e 124, XIX) e um nome reserva.
- [ ] **Grupos e ranking**: continuam opt-in por código? (os documentos assumem que sim.)
- [ ] **Telemetria (P17)**: ligar em produção só depois de atualizar a política de
      privacidade com os dados novos.
- [ ] **Revisão por advogado(a)** dos dois documentos jurídicos antes de publicar (P14 só
      integra; não publica para fora do beta).
- [ ] **Instalar nos três alvos** depois de cada bloco (web pela Vercel, Mac e iPad) —
      regra 5 do PRODUCT.md, e é você quem tem o Xcode.

---

## O que NÃO pedir (decidido, com razão)

- Questões do TEC/QC como fonte de banco público (dependência, anti-bot e risco de
  origem — o banco ENAM nasce dos PDFs oficiais, Lei 9.610/1998, art. 8º, IV).
- IA preenchendo a grade de leitura sozinha ou comentando questões em massa (a
  aprendizagem está em marcar; comentário é obra própria e revisada).
- Campo de autodeclaração de cota (dado sensível, LGPD, art. 5º, II — a meta é só um número).
- Ranking de nota de simulado entre pessoas.
- Cobrança agora (fase 2, depois do beta com quem reprovar no ENAM VI).
- Android nativo agora (iPhone via PWA já existe; Android fica para depois da tração).
- Competir com o TEC em volume de objetivas (roadmap, "fora de escopo").
