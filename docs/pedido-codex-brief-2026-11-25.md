# Pedido ao Codex — brief de 25/11/2026 (11 itens)

Este arquivo é o prompt inteiro. A dona cola no app do Codex só a linha abaixo; o resto o Codex lê daqui.

> Leia e siga, do começo ao fim, `docs/pedido-codex-brief-2026-11-25.md` do branch `docs/pedido-codex-brief-2026-11-25`: `git fetch origin && git show origin/docs/pedido-codex-brief-2026-11-25:docs/pedido-codex-brief-2026-11-25.md`.

Preparado pelo Claude Code em 25/11/2026 a pedido da dona (Lana). O texto literal do brief e do adendo está no
Anexo A e manda sobre o resto. As seções 4 a 6 trazem o que foi levantado no código e no banco vivo em 25/11, só
por leitura: o banco foi lido pelo Claude Code, e cada item foi mapeado por um agente que abriu os arquivos. A
verificação adversarial dos mapas terminou depois, e dois revisores leram este arquivo contra o código; as
correções deles estão no commit seguinte a `111de26`. Trate cada linha citada como ponto de partida e confira o
trecho ao abrir: se o código divergir, o código manda, e você registra a
divergência na devolução. As linhas de `Catedra.dc.html` são da `ff3c87f`; o PR #258 (já na `main`, `806b4a9`)
desloca esse arquivo em +12 a +83 linhas: procure pelo trecho citado, não pelo número.

## 1. O pedido em uma frase

Executar os itens 1 a 7 e 9 a 11 do brief, um item por branch e por PR (os itens 2 e 10 dividem um PR, seção 7),
cada um com teste novo em `tests/`, sem criar funcionalidade fora da lista e sem inventar. O item 8 não é código e
já foi resolvido à parte (seção 6). A trava de data caiu: a dona respondeu "Pode começar já" em 25/11. Ela faz o
ENAM em 29/11: junte as perguntas numa mensagem só (seção 8) e siga com os padrões provisórios enquanto ela não
responde.

## 2. Preparo, antes de qualquer item

1. `git fetch origin`. Todo branch parte da `origin/main` mais nova (em 25/11: `ff3c87f`, merge do PR #256).
   Nunca parta do branch do checkout principal (`codex/proteger-pontes-postmessage`, em `7b7e8dd`): ele contém o
   histórico de antes da reescrita de 01/10, e o gancho `pre-push` recusa o commit `a9c0381`.
2. Leia o `CLAUDE.md` inteiro. Não há `AGENTS.md` versionado: as regras da casa estão no `CLAUDE.md`, e as
   "Regras invioláveis" valem para você. Leia também `PRODUCT.md`, `DESIGN.md` e, em `docs/pedidos-claude-code.md`,
   as seções "Decisões minhas" (linhas 413–445) e "O que NÃO pedir" (447–457).
3. Um worktree por item, fora do iCloud (`~/Desktop` e `~/Documents` esvaziam arquivos e já devolveram conteúdo
   errado na leitura):
   ```bash
   git -C ~/catedra-plataforma-main worktree add ~/catedra-plataforma-main/.claude/worktrees/codex-<n>-<nome> -b codex/<nome> origin/main
   cd ~/catedra-plataforma-main/.claude/worktrees/codex-<n>-<nome> && git branch --show-current
   ```
4. Em cada worktree novo: `npm ci`, e `node scripts/build.mjs` antes de `npm run test:webkit` (worktree novo não
   tem `public/`, e sem ele o runner WebKit pula o site publicado).
5. Ganchos: `git config core.hooksPath` aponta para `~/catedra-plataforma-main/scripts/hooks`. O `pre-commit` roda
   `scripts/verificar-segredos.mjs --staged`. Rode `node scripts/verificar-segredos.mjs` antes de cada push.
6. Não mexa no diretório de trabalho de `~/catedra-plataforma-main`: ele tem mudanças sem commit de outra sessão.
7. Duas suítes ao mesmo tempo precisam de `CT_PORT` diferente (padrões 8123 e 8124), senão a segunda morre com
   `EADDRINUSE`. `npm test` roda os dois builds por dentro e reescreve `public/` e `mac/build/web`: não rode build
   nativo no mesmo worktree ao mesmo tempo.

## 3. Limites

### Regras do brief (literais)
- Não criar funcionalidade fora desta lista.
- Cada módulo puro novo ou alterado precisa de teste sem navegador, como `redacao-motor.js`.
- Não inventar: se não conseguir verificar, dizer que não verificou.
- Para cada item, devolver: o que encontrou, o que mudou (arquivos), como verificou (comando ou teste), o que
  ficou pendente.

### Pare e espere o sim da dona antes de
- **Escrever no Supabase vivo** (projeto `catedraplataforma`, id `frcnfqxniwzdyykvgqqu`): migration, `admin_config_set`
  (inclusive ligar a telemetria), mudança de Auth, `insert` de teste. Prepare o SQL em
  `supabase/migrations/AAAA-MM-DD-<assunto>.sql` e os casos em `supabase/testes/AAAA-MM-DD-<assunto>.sql` (numa
  transação que se desfaz, padrão de `supabase/testes/2026-10-01-widget.sql`), diga o que mudam e espere. Antes de
  escrever uma migration, parta da definição viva da função (`select pg_get_functiondef('public.<nome>'::regproc)`;
  se você não tiver acesso ao banco, use as definições da seção 4): o banco tem 19 migrations aplicadas, e
  `supabase/migrations/` tem 10 arquivos, com outros nomes.
- **Mesclar**: não mescle. Abra o PR, espere a CI e registre o resultado.
- **Buildar ou instalar no Mac e no iPad**: não faça a partir dos branches dos itens. As regras se contradizem
  (`CLAUDE.md:61` manda instalar sem perguntar; o plano de 03/10 em
  `docs/superpowers/plans/2026-10-03-redacao-mesa-de-prova.md:23` diz que só a sessão "Fusão de melhorias do Codex"
  instala; `docs/pedidos-claude-code.md:15` diz que a dona instala). Pergunte quem instala depois dos merges.
- **Mudar uma regra de produto escrita** (`PRODUCT.md`, `.impeccable/surfaces/*.md`, Política de Privacidade) além do
  que o próprio brief manda.

### Nunca
- Contornar o sandbox: se ele bloquear rede, `git push`, `gh` ou escrita em `.git`, pare e diga exatamente o que foi
  bloqueado.
- Mudar versão de dependência (`CLAUDE.md:60`).
- Mexer nos worktrees de outras sessões (seção 4).

## 4. Fatos verificados em 25/11

### Banco vivo (`catedraplataforma`, lido pelo Claude Code com `pg_get_functiondef`, só leitura)
- `registrar_erro_cliente(p_build, p_alvo, p_tela, p_mensagem, p_ts)`: `SECURITY DEFINER`, só `authenticated`. Sem
  sessão, levanta `nao_autenticado`. Devolve `false` **sem gravar** se `telemetria_ligada()` for falso ou a mensagem
  vier vazia, e acima de 50 por conta por dia. Corta build em 40, alvo em 20, tela em 40 e mensagem em 300.
- `telemetria_ligada()` lê `app_config.chave = 'telemetria'`. **A chave não existe**: a função devolve falso, e essa
  é a causa provável das 0 linhas em `erros_cliente`.
- `admin_erros_cliente(p_horas)`: só admin; devolve até 200 erros da janela (padrão 24 h), filtrando por
  `recebido_em`.
- `entrar_lista_espera(p_email, p_area default null)`: `anon` e `authenticated` executam (por desenho). Já faz
  `lower(trim(p_email))`, valida formato e tamanho (e-mail até 254, área até 60; `valor_invalido`), trava com
  `pg_advisory_xact_lock`, limita a 10.000 no total e 60 por minuto (`lista_temporariamente_indisponivel`), volta em
  silêncio na duplicata e grava `(email, area, origem='sobre')`. Índice único `lista_espera_email_uidx` em
  `lower(email)`.
- `admin_lista_espera()`: SQL, `setof lista_espera where is_admin()`. Conta comum recebe vazio, **sem** erro.
- Tabelas: `erros_cliente` (id, user_id, build, alvo, tela, mensagem, ts, recebido_em) e `lista_espera` (id, email,
  area, origem, criado_em), as duas com 0 linhas.
- Organização no plano **free**. Avisos de segurança: `auth_leaked_password_protection` (item 8) e as funções
  `SECURITY DEFINER` executáveis por `anon` (`entrar_lista_espera`, por desenho, e `widget_ler`).

### CI, publicação e vizinhos
- `.github/workflows/testes.yml` roda em PR e em push na `main`, sem filtro de caminho. Checks exigidos na `main`:
  `testes` e `Testes WebKit (Safari)`, com `strict=false` e 0 aprovações. Não renomeie esses jobs.
- O WebKit está **instável** em `tests/login-leitores-web.mjs:87` (veio com o PR #256). No PR #257, que só muda
  documento, ele falhou em `f506d86` e passou em `42e4cfa` e `e1050d9`. `tests/run-webkit.mjs:156` chama o caso sem
  `try/catch`, então o timeout derruba o runner inteiro e pula a iteração `file://` dos casos seguintes.
- A Vercel publica o build de cada merge na `main`. Commit feito no Mac sai "unverified" e o preview do PR aparece
  bloqueado; isso não é falha sua.
- PR aberto que toca arquivos destes itens: #253 (sobe o teto do acervo offline de 14 para 15 MiB em `sw.js` e
  `scripts/build.mjs`, e mexe em `tests/run.mjs`); o #260 (acervo de 25/11) traz a mesma subida. O #250 mexe em
  `treino.js`.
- **PR #259** (rascunho aberto em 25/11 por outra sessão, ramo `banco-espelhos-venda`: a página de venda do banco de
  espelhos) mexe nos mesmos arquivos de vários itens:
  - `PRODUCT.md`: tira "preço" das ausências (linha 72), cria o parágrafo `**Preço:**` com os dois preços (desde
    `b384d2f`: o do banco de espelhos, "R$ 197 por um mês de acesso, pagamento único", e o previsto do beta em
    `sobre.html`) e reescreve a linha 64 com "586 quesitos de 36 provas", que um teste dele exige;
  - `.impeccable/surfaces/sobre-html.md`, a Política (sobe para 1.3, com `privacidade.html` e `juridico.js`) e o
    título e o subtítulo de `banco-espelhos.html` ("2021 a 2026");
  - `scripts/build.mjs`, `scripts/build-macos.mjs`, `tests/run.mjs` e `tests/run-webkit.mjs`;
  - a migration `supabase/migrations/2026-11-25-lista-espera-interesse-venda.sql`, **não aplicada**, que recria
    `entrar_lista_espera`, apaga o índice `lista_espera_email_uidx` e cria dois índices parciais (beta e
    `banco-espelhos`).

  Ele cruza com os itens 2, 2b, 3, 6, 7 e 10. Não mexa nele. Antes de cada um desses PRs, veja se ele entrou e parta
  da `main`. Se a migration dele tiver sido aplicada, os fatos da lista de espera desta seção ficaram velhos.
- **PR #266** (aberto em 25/11 por outra sessão, ramo `melhorias/sobre-quesitos-formulario`, não é rascunho) mexe
  em `sobre.html` e no bloco P15 de `tests/run.mjs`:
  - o mosaico passa a "586 · quesitos de 36 provas com espelho oficial", com `data-n="quesitos"` conferido contra
    `CT_ESPELHOS.meta`, e ganha a nota dos 502 quesitos com valor e 84 sem;
  - no cartão da Segunda fase, "a exigência literal, a pontuação atribuída" vira "a exigência da banca, os
    dispositivos que o espelho cita e o valor, quando o espelho o traz separado"; "Nada de opinião no lugar do
    critério." fica;
  - os campos do formulário perdem o `name` (sem script, o envio punha o e-mail na URL), travados pelo teste
    `camposSemNome`; a borda dos campos muda de cor.

  Ele cruza com os itens 2, 3, 6, 10 e 11 e com os PRs 2b e 2c. Se tiver entrado, parta dele:
  - o item 10 troca os números escritos à mão pelos gerados e mantém o `data-n`; até lá, o item 6 atualiza o mosaico
    e a nota, porque o teste do #266 cai quando o acervo cresce;
  - o PR 2+10 tira a frase e acrescenta o espelho sugerido sem desfazer o texto novo;
  - a isca do item 3 vai sem `name`;
  - no PR 2b, radio sem `name` não forma grupo: dê `name` só ao grupo da pergunta e estreite o `camposSemNome` a
    ele, dizendo no PR por quê (a resposta não é dado pessoal), ou faça as opções como botões com `aria-pressed`.
- Worktrees de outras sessões têm trabalho sem commit nos mesmos arquivos:
  - `redacao-segunda-leitura`: linha de export de `redacao-motor.js`;
  - `espelho-sugerido-selo`: `espelho-sugerido.js`;
  - `retomar-mesa-discursiva`: `Catedra.dc.html` e `tests/redacao-mesa.mjs`, que os itens 9 e 11 também mudam;
  - `quesitos-perdidos`: `Catedra.dc.html`, `scripts/build.mjs`, `scripts/build-macos.mjs`, `tests/run*.mjs` e o
    arquivo novo `quesitos-perdidos.js`;
  - `fora-do-escopo-flag`: `Catedra.dc.html`, `tests/run.mjs` e `tests/run-webkit.mjs`;
  - `quantidade-real-arguicao`: `Catedra.dc.html`, `tests/run.mjs` e `tests/oral-sala.mjs`;
  - `geometria-interface`;
  - `juridico-lgpd-retencao` (sem PR): `sobre.html` (o link da Política no rodapé passa a ler versão e data de
    `juridico.js`), `scripts/build-juridico.mjs` (referência dos itens 7 e 10), Termos, Política, `juridico.js`,
    `auth.js`, `Catedra.dc.html` e uma migration nova; cruza com o PR 2b.

  O `banco-espelhos-venda` virou o PR #259 (acima). Parte do resto também já é PR: #265 (`redacao-segunda-leitura`),
  #262 (quesitos perdidos), #263 (espelho sugerido), #264 (fora do escopo) e #261 (ENAM pós-prova), todos em
  `Catedra.dc.html` e `tests/run*.mjs`. Espere conflito de mescla e não toque nesses worktrees nem nesses PRs.

## 5. Como testar nesta casa

- Módulo de teste novo: `import` nomeado no topo de `tests/run.mjs` (bloco das linhas 21–101) e chamada em
  `try/catch` no fluxo, virando `ok(false, ...)` na exceção. No WebKit, o mesmo em `tests/run-webkit.mjs`, dentro do
  laço de origens (108–307); dentro do bloco `if (origem === 'http')` (168–236) quando semeia por `/__semente`.
- **Teste sem navegador de verdade** (exigência do brief): "sem navegador" hoje quer dizer "sem DOM", porque
  `tests/run.mjs` lança o Chrome na linha 112, antes de tudo. Para o teste rodar sem Chrome, faça um arquivo
  `tests/<nome>.test.mjs` com `node:test` (modelo: `tests/metricas-abertura.test.mjs`), carregando o módulo `<script>`
  por `vm.runInNewContext` com `{ window: {} }` (modelo: `tests/redacao-motor.mjs:12–16`). Ligue-o como passo
  próprio na CI (junto de `.github/workflows/testes.yml:27–30`) e na suíte por `spawnSync` (padrão de
  `tests/run.mjs:4077`).
- Teste que toca o Supabase simula o client (padrão de `tests/run.mjs:3990`). A suíte não usa rede
  (`tests/_infra.mjs:69`) e serve a **raiz do repositório**, não `public/` (`tests/_infra.mjs:26`).
- SQL: checagem estática no molde de `tests/exclusao-conta-cobertura.mjs` e casos em `supabase/testes/` numa
  transação que se desfaz. Tabela nova com coluna `user_id`, `criador` ou `admin_uid`, ou com coluna de nome
  terminado em `email`, cai na régua EXC2 (`tests/exclusao-conta-cobertura.mjs:12` e `:109`).
- Arquivo novo entra nas listas de cópia dos dois builds. Se for `<script>` do `<head>` do host, entra também na
  `casca` do service worker (`scripts/build.mjs:370–380`), com `defer` (`tests/carregamento-inicial.mjs:55`): fora
  da casca, o app instalado abre offline sem ele. Vale para qualquer item.
- Teste que prova aparência **mede** (contraste calculado, caixas, `getComputedStyle`) e olha a captura.
- Teste que depende de "hoje" fixa o relógio em contexto próprio (`tests/registro-sessao.mjs:37–41`). Semeie o
  `localStorage` por `base + '/__semente'` e leia o storage pelo menos 1,3 s depois de agir.

## 6. Os itens

Cada item traz: o que já foi verificado, o que fazer, quando está pronto e onde costuma quebrar. Onde há decisão
da dona, siga o padrão provisório da seção 8, marque "provisório" no PR e siga em frente.

### Item 1 — Registro de erros do cliente

**Verificado.**
- Os tratadores globais que enfileiram ficam só no host, no script inline do topo (`Catedra.dc.html:13–14`).
  `carregamento-inicial.js:98–99` também escuta, só para trocar a tela de abertura, sem enfileirar. Eles não chamam a
  RPC: gravam em `catedra:_errFila` (`{ts, m}`, teto de 20, mensagem cortada em 300) sempre, com ou sem conta e com
  ou sem rede. É a fila offline. `auth.js:436` também enfileira quando `widget_publicar` falha.
- Quem envia é `_telemetriaEnviar` (`Catedra.dc.html:14577–14585`): lotes de 5, só com `telemetriaLigada` (vinda de
  `app_avisos`), conta logada, client e `navigator.onLine`. Os gatilhos são a página oculta (8148), o evento
  `online` (8149) e o retorno de `_loadAvisos` (16914).
- Hoje nada chega por dois motivos. (1) A chave `telemetria` não existe no banco, então o cliente nem envia. (2) Se
  enviasse com o servidor devolvendo `false`, o item **sairia da fila sem ter sido gravado**: `14584` só olha
  `r.error`.
- Outros furos do cliente:
  - a fila é regravada a partir de um instantâneo lido antes dos `await` (14582/14585), e o erro que entra durante o
    envio se perde;
  - no boot offline, a fila só anda quando a sessão é retomada (passo 2);
  - tela e build enviados são os do momento do envio, não os do erro;
  - os 7 satélites não capturam erro, e `support.js` engole os erros de `renderVals` e do ciclo de vida.
- O console já busca `admin_erros_cliente(24)` (`Catedra.dc.html:16941`) e lista os erros no painel
  `data-adm="telemetria"` da aba "IA & custo" (6546–6547), **sem contador**. O interruptor fica na aba Controle
  (6625–6627; `admToggleTelemetria`, 14598–14600).
- Os testes atuais (`tests/run.mjs:3955–4016`) simulam a RPC sempre com `data:true` e não pegam o descarte.

**Faça.**
1. Em `_telemetriaEnviar`, só tire da fila com `r.error` nulo **e** `r.data === true`. Releia a fila do
   `localStorage` antes de gravar e remova por identidade (`ts` + `m`).
2. Boot offline: prove por teste se a fila esvazia quando a rede volta. Com a sessão pendente, `CatedraAuth.user`
   fica nulo até `auth.js:405` retomar a sessão, o que dispara `catedra:authuser` e `_loadAvisos`
   (`Catedra.dc.html:8266`). Reler `app_avisos` no evento `online`, sozinho, não basta. Só mexa se o teste mostrar
   que a fila não anda.
3. Contador das últimas 24 h no cabeçalho do painel "Erros nas últimas 24 h", derivado da lista (mostre "200+" no
   teto da RPC). Não acrescente consulta ao `Promise.all` sem rever o `=== 11` de `acessoNegado` (16944).
4. Prova ao vivo, só depois do sim da dona (decisão 1a). Ela liga a telemetria em Ajustes › Administração ›
   Controle e roda, logada, no console do navegador:
   `setTimeout(()=>{throw new Error('teste-erro-cliente-'+Date.now())})`.
   Em seguida, confira no painel ou com
   `select count(*) from erros_cliente where mensagem like 'teste-erro-cliente-%'`.
   Escreva esses passos no PR.

**Pronto quando.**
- Casos novos com a RPC simulada:
  - `{data:false, error:null}` deixa o item na fila;
  - um erro disparado durante o envio continua na fila depois;
  - a volta da rede, num boot offline, esvazia a fila sem recarregar;
  - o contador mostra 0, 3 e "200+", medido.
- Se a lógica da fila sair para um módulo puro, ele tem teste `node:test` e segue a regra de arquivo novo da
  seção 5 (listas de cópia, casca e `defer`).
- Casos SQL em `supabase/testes/` (telemetria desligada devolve `false` e não grava; ligada grava com os cortes;
  51ª no dia devolve `false`), preparados e não rodados sem o sim.

**Cuidado.** `supabase-js` não rejeita a promise: olhe `r.error` antes de `r.data`. O script do topo roda antes de
tudo e no JavaScriptCore: mantenha-o ES5 e autocontido. Forçar erro por `dispatchEvent` pinta a faixa `#ct-errbar`:
remova-a no teste. O alvo do iPad é `iPadOS`, não `iPad` (`ios/build-ipad.sh:94`; `tests/run.mjs:3996` aceita
`iPad`).

### Item 2 — Landing (`sobre.html`), menos a contagem (que vai com o item 10)

**Verificado.**
- A frase "Nada de opinião no lugar do critério." existe inteira em `sobre.html:111`, no cartão "Segunda fase"
  (`h3` na linha 110, exigido pelo teste da linha 3707). O parágrafo não fala de IA nem de espelho sugerido.
- No app, o espelho por IA é **a pedido** ("Gerar espelho sugerido"), só na Redação, para prova do banco sem
  gabarito (hoje 38 de 631: 35 "nao-publicado" e 3 "restrito"). Precisa de rede e sai com o selo "Sugerido — não
  oficial" e o texto "gerado por IA — confira os fundamentos. A nota sai aproximada." (`Catedra.dc.html:3861–3862`).
- Preço é proibido hoje em quatro lugares: `PRODUCT.md:72`, `.impeccable/surfaces/sobre-html.md:16`, o comentário
  de `sobre.html:9` e o teste `tests/run.mjs:3705`, que reprova `R$`. Também aparece em
  `docs/pedidos-claude-code.md:309` (P15 sem preço) e na linha 455 ("Cobrança agora" em "O que NÃO pedir"). O brief
  de 25/11 é a decisão nova da dona e manda pôr a linha.
- O formulário envia só `p_email` e `p_area` (`sobre.html:187`). A linha `sobre.html:157` e a Política
  (`docs/juridico/politica-de-privacidade.md:26` e `:39`, versão 1.2) dizem que a lista guarda só e-mail, área e
  data, e `tests/run.mjs:3573` trava essa frase e a forma do corpo.

**Faça (PR 2+10).**
1. Reescreva o parágrafo da Segunda fase. Onde a banca publicou espelho, a correção segue esse espelho; nas demais
   provas, o app pode sugerir, a pedido, um espelho por IA, com o selo "Sugerido — não oficial", fundamento em cada
   quesito e nota aproximada. Retire "Nada de opinião no lugar do critério.". Não prometa IA offline (o hero promete
   "sem depender de internet") nem cite foto (item 11). Não estenda a todas as provas o "cada quesito com a
   exigência literal, a pontuação atribuída" de hoje: na Redação, "com espelho" também conta padrão de resposta em
   texto e PDF, sem pontuação por quesito (item 10).

**Faça (PR 2c, separado: a linha de preço).** A dona decidiu em 25/11, já sabendo do PR #259 (decisão 2a): a
landing mostra o preço do beta. Ponha "Quando abrir, R$ 197 por ano (valor previsto, pode mudar)." na caixa
`.honesto` (`sobre.html:135`). A linha fala do futuro: os Termos (2.2 e 9.1) dizem que hoje a Cátedra é gratuita,
e nada nela pode sugerir cobrança agora. Ajuste junto:
- `PRODUCT.md`. Se o #259 tiver entrado, nada a mudar: desde `b384d2f` o parágrafo `**Preço:**` dele já registra os
  dois preços, com a frase do beta entre aspas; só confira que ela é igual à da página. Se não tiver entrado: tire
  "preço" das ausências (linha 72) e crie logo abaixo um parágrafo `**Preço:**`, de uma linha só, com o preço do
  beta, onde ele aparece e "Nenhum outro preço da Cátedra pode aparecer em tela". Quando os dois se cruzarem, fica o
  texto do #259, que traz as duas ofertas na mesma linha (`tests/venda-espelhos.mjs:80` procura `**Preço:**` e
  "R$ 197 por um mês" numa linha só);
- `.impeccable/surfaces/sobre-html.md:16`, com a exceção só para essa linha;
- o comentário de `sobre.html:9`;
- o teste da linha 3705, que passa a aceitar **só** essa linha e continua recusando qualquer outro `R$`, "por mês" e
  "assinatura por".

Não mexa nos Termos nem em `docs/pedidos-claude-code.md` (as linhas 309 e 455 são registro da dona). Na descrição
do PR, cite a decisão de 25/11 e o item "Marca" das "Decisões minhas": a busca de colidência no INPI, que o #259
põe antes do primeiro preço sob o nome, e esta linha pode ser esse preço. Se o #259 ainda estiver aberto, avise na
descrição que os dois mudam o mesmo parágrafo de `PRODUCT.md` e que, no conflito, fica o texto dele. Esse PR não
bloqueia o PR 2+10 e não espera mais resposta para ser feito; o merge, como todos, espera o sim da dona.

**Faça (PR 2b, separado, só depois do sim da dona).** A pergunta de disposição a pagar (decisão 2b):
1. Parta da definição mais nova de `entrar_lista_espera`: a do banco vivo (seção 4) ou a do PR #259, se a
   migration dele tiver sido aplicada. Migration com coluna nova de nome neutro e `check` do conjunto fechado. `drop function
   public.entrar_lista_espera(text,text)` e recriação com o parâmetro novo `default null` (sem o drop, o PostgREST
   fica com duas funções e a chamada nomeada falha), com `revoke`/`grant` refeitos.
2. Política (seções 2 e 3) e a linha "Guardamos só…" atualizadas juntas, regenerando `privacidade.html` e
   `juridico.js` por `scripts/build-juridico.mjs`.
3. A migration é aplicada **antes** do merge da página. Se o corpo mandar uma chave que a RPC viva não conhece, a
   lista inteira cai em "Não deu para registrar agora".

**Pronto quando.** Teste `node:test` sobre `sobre.html` sem comentários: a frase velha sumiu; o cartão cita espelho
oficial e espelho sugerido por IA; e, no PR 2c, há exatamente uma linha de preço, que no Chromium pinta com
contraste ≥ 4,5:1 medido. No PR 2b: nenhuma opção vem marcada, o envio sem resposta manda `null`, os rótulos das
opções têm 44 px ou mais (a regra `input, select` de `sobre.html:69` deforma radios) e os casos SQL estão
preparados.

**Cuidado.** Três "35" diferentes (decisão do item 10). A duplicata volta 2xx de propósito, para não revelar
cadastro; o ramo 409 de `sobre.html:191` é código morto, e o teste `duplicadoAvisa` prova um 409 que o banco não
produz. Não "conserte" sem decisão.

### Item 3 — Lista de espera

**Verificado.** Quatro dos seis pedidos já estão no banco vivo e em
`supabase/migrations/2026-10-07-seguranca-lista-espera.sql`: normalizar, deduplicar, validar formato e validar
tamanho. O cliente também normaliza e valida (`sobre.html:173` e `:179`). Faltam dois:
- **Honeypot:** não existe. O formulário (`sobre.html:143–158`) só tem e-mail e área.
- **Admin vê a lista:** a RPC existe, mas o console não a chama. `Catedra.dc.html` não tem nenhuma ocorrência de
  `lista_espera`, e nenhuma das 7 abas (20820) mostra a lista, embora a Política (5.4, linha 60) diga que a
  administração lê.

**Faça.**
1. Isca no cliente (decisão 3a): um campo dentro do form, num invólucro com `aria-hidden="true"`, `tabindex="-1"`,
   `autocomplete="off"`, nome neutro que o autofill não reconheça, escondido com `position:absolute` fora da tela ou
   `display:none`. Não use `.ct-sr`, que o leitor de tela lê. Isca preenchida: nenhuma chamada de rede e a mesma
   mensagem de sucesso. O corpo continua `{ p_email, p_area }`.
2. Painel "Lista de espera" na aba Controle, junto de "Quem pode entrar" (`Catedra.dc.html:6650`), lendo
   `admin_lista_espera`: e-mail, área e data (`criado_em`, em snake_case; a lista de convites usa `criadoEm`), total
   e aviso de lista vazia. Estado só de tela: fora de `_autosaveKeys` e do `localStorage`, porque são e-mails de
   terceiros.
3. Teste estático do conteúdo do arquivo de 07/10. Hoje ele só é lido pela cobertura da exclusão de conta, e
   nenhum teste confere a RPC: `lower(trim`, trava, limites, `revoke insert` e `grant execute`. Se o PR #259 tiver
   entrado, confira a migration mais nova que define `entrar_lista_espera` (a dele apaga `lista_espera_email_uidx` e
   cria dois índices parciais), não só a de 07/10.

**Pronto quando.** No Chromium: isca preenchida = zero `fetch`; isca vazia = 1 chamada com o corpo de sempre. A
isca fica fora da vista e do foco, medida (Tab vai do e-mail para a área e depois para o botão; a altura do form não
muda). O console com `rpc` falso (padrão de `tests/seguranca-perfil-release.mjs:38`) pinta as linhas, e a conta
comum continua vendo "Esta conta não é administradora.". No WebKit, a isca não é preenchida pelo autofill.

**Cuidado.** **Não troque `=== 11` por `=== 12`** em `Catedra.dc.html:16944`: `admin_lista_espera` devolve vazio,
não `acesso_negado`. Reescreva a condição como "há falhas e todas são `acesso_negado`". `admin_lista_espera` não
tem `LIMIT`, e o PostgREST corta em 1000 por padrão (não conferido no vivo): avise que são os mais recentes. O
honeypot não para quem chama a RPC direto com a chave pública.

### Item 4 — Tópico obrigatório ao iniciar o cronômetro

**Verificado.**
- Toda porta de início passa por `toggleTimer` (`Catedra.dc.html:9358`), a única função que liga o tique numa
  sessão nova. A chamada da linha 9525 só restaura um cronômetro que já rodava. Fora de um bloco do Ciclo ou do
  Magistratura, o cronômetro começa sem disciplina e sem tópico.
- As portas:
  - Início "Iniciar" (1750; fora do Magistratura é o próprio `toggleTimer`, 11971) e "próxima tarefa" (1859);
  - chip "Focar" → "Iniciar" (961/976) e "Entrar no modo foco" (987);
  - Ciclo "Estudar agora" (2546) e foco do bloco (2590);
  - Magistratura (11939, 12417–12430);
  - tecla F (7864) e espaço na sala (7861);
  - ⌘K "Iniciar Modo foco" (18025, 20267);
  - sala (1265);
  - PiP da web (12882) e do iPad (12763).
- O tópico só aparece no registro, depois, e é opcional:
  - `saveSession` aceita sem tópico (12667) e grava "Geral" sem disciplina (12671);
  - o seletor fica atrás de "Mais detalhes" (1025);
  - o edital só é marcado com o checkbox `marcarEdital`, que vem **desligado** (12339, 12699), e marcar significa
    **concluído** (`done`);
  - a cobertura do edital é `done/total` (18869, 18948).
- O ⌘K (7866) abre a paleta, que só indexa lei, verbete, peça e rito (17917; `busca-unica.js:110`). Não há busca
  de tópico do edital em lugar nenhum.
- `ct_timer` guarda disciplina e tópico só com bloco (`atvKey`, 9469) e nunca guarda `edTop`/`edSub`. A oferta de
  registro em um toque ao pausar (U11) fora do Magistratura (9415–9438), grava `edTop:null` (12655) e sugere a disciplina da **última sessão**
  (9415). No Magistratura com bloco (9395–9413), o "Registrar" chama `saveSession` com o rascunho do bloco (9405) e
  já grava o `edTop` que ele trouxer.

**Faça (com as decisões 4a a 4e).**
1. Portão em `toggleTimer` só para início **novo** (zerado, `!_cronometroEmUso`, sem `atvKey` e sem tópico): abrir o
   seletor de tópico em vez de ligar o tique. Retomar nunca pergunta (espaço, PiP "alternar", restauração).
   `enterFocus` sem bloco passa pelo mesmo portão.
2. Seletor com busca e foco no campo, alimentado por `_topicosDe` (vista do concurso ativo; subtópico pode ser
   string ou `{name}`), com alvos de 44 px. Entra em `_ocupado` (7857), senão F e espaço agem por baixo dele, e Esc
   fecha sem iniciar.
3. ⌘K: os tópicos do edital entram na paleta como tipo novo. Escolher um tópico inicia o cronômetro nele quando ele
   está zerado. Com o cronômetro em uso, não troque o tópico nem zere o tempo: abra o registro da sessão atual e
   avise, como o Magistratura já faz (`Catedra.dc.html:12720`). Se mexer
   em `busca-unica.js` (módulo puro), faça teste `node:test`.
4. Guarde o tópico escolhido no próprio `ct_timer` (local, por titular, apagado no logout; sem chave `catedra:`
   nova) e restaure-o. A oferta U11 e o registro passam a usar o tópico do cronômetro.
5. Cobertura como consequência de iniciar, conforme a decisão 4a.

**Pronto quando.**
- Chromium, com relógio fixo em contexto próprio:
  - cada porta, com cronômetro zerado, abre o seletor e não liga o tique;
  - escolher o tópico liga o cronômetro e o `ct_timer` guarda disciplina, `edTop` e `edSub`;
  - recarregar mantém o tópico;
  - retomar não pergunta;
  - ⌘K acha o tópico do edital ativo e não o de outro concurso.
- WebKit com toque: do Início ao cronômetro rodando com tópico em até 3 toques, alvos de 44 px ou mais medidos, e
  o PiP "alternar" ainda retoma.
- Os testes que iniciam do zero e sem bloco passam pelo portão e são atualizados sem afrouxar o que provam:
  `cronometro-pausa.mjs:40` e `run.mjs:6338` e `6376`.
- Os outros não devem mudar com o portão:
  - `ipad-toque.mjs:267` é uma retomada (a linha 261 põe `timerSeconds: 754` antes do "alternar");
  - `ciclo-plataforma.mjs:29` e `ciclo-magistratura.mjs:221` iniciam com o bloco do Magistratura (`toggleTimer`
    preenche o rascunho por `_cmContexto`, `Catedra.dc.html:9362`);
  - em `ciclo-magistratura.mjs:225`, o foco entra com o relógio já correndo.

  Se um desses quebrar, o portão está pegando retomada ou bloco: conserte o portão, não o teste.

**Cuidado.** `toggleTimer` (9358) e `enterFocus` são ligados por `onclick="{{ … }}"` (976, 987, 1265, 1859), e o
runtime entrega o evento como 1º argumento. Não acrescente parâmetro posicional para pular o portão depois da
escolha: o evento cairia nele e todo botão pularia o seletor. Ligue o tique por uma função própria.

No Magistratura, o início por bloco já traz contexto, e "Registrar fora do ciclo" (12432) apaga o
vínculo: só esse caminho avulso pede tópico. Sem edital, o rascunho nasce com "Direito Constitucional" (12339), e
um portão rígido travaria quem não tem edital (decisão 4b). O domínio por tópico usa `s.topico` normalizado
(12322): grave o nome exato do tópico do edital.

### Item 5 — Teste WebKit na CI

**Verificado.**
- O job `Testes WebKit (Safari)` já roda em todo PR e em todo push na `main`, ou seja, a cada merge que a Vercel
  publica.
- `tests/oral-lei-seca.mjs` já abre a Fase Oral › Lei seca e exige pelo menos 1 chip de lei, em `http` e
  `file://`. Mas ele não compara com `CT_LEIS`, que só aparece no diagnóstico (linha 143), e entra por
  `__catedraGoView('oral')`, não pelo botão "Fase Oral" (`Catedra.dc.html:807`).
- `tests/legis-guiado.mjs` marca "Quem?" na grade de 7 perguntas, mas abre `legis-web.html` sozinho, com o portão
  de login substituído (`abrirComponenteDoLeitor`). Nenhum teste abre o CátedraLEGIS **pelo host**, com sessão, e
  marca a grade.
- O runner é próprio, sobre `playwright-core` (sem `@playwright/test` e sem `projects`).

**Faça.**
1. Primeiro, estabilize o runner (decisão 5c):
   - `try/catch` com `ok(false, ...)` nos `await` soltos de `tests/run-webkit.mjs` (156, 157, 159, 161, 192–194,
     327, 332);
   - em `tests/login-leitores-web.mjs:62–89`, registre a espera do recarregamento do quadro antigo
     (`page.waitForEvent('framenavigated', …)`) **antes** do `page.evaluate` da linha 62, porque o `dispatchEvent`
     da linha 69 já dispara o recarregamento; espere por ela antes do `replaceWith` (linha 84), na mesma ordem das
     linhas 51–55;
   - mire o quadro novo por seletor próprio, não o genérico `'iframe'`.
   - Não aumente só o timeout.
2. Lei seca: entrar pelo botão `button[data-view="oral"]` e clicar em `button[data-m="lei"]`. Só dentro do cartão de
   Lei seca (o `.ct-card` que contém "Sortear artigo", como em `tests/oral-lei-seca.mjs:93–107`), afirmar que os chips
   com `data-v` não vazio são mais de zero **e** iguais a `window.CT_LEIS.length`. A Prova oral tem outros
   `button[data-v]` (minutos, ramo, tribunal): contados juntos, o número não bate.
3. LEGIS pelo host: módulo novo que usa `definirContaLeitora` (`tests/_sessao-leitores.mjs:21–28`).
   - Clique em `button[data-view="legis"]` e espere `iframe[data-ct-view="legis"]`.
   - Sirva o texto da lei por `ctx.route` em `**/api/law**`: a suíte não tem rede, e `/api/law` dá 404.
   - Ligue `#rdrLA` e marque "Quem?".
   - Afirme o registro em `CT_LA_CANAL` e no `localStorage` do host.
   - Em `file://`, o `ctx.route` não ajuda: com `LAW_API_BASE` vazio, a chamada vai para `file:///api/law`, e sem
     `CATEDRA_API_BASE` o leitor nem abre lei (`legis-web.html:617` e `858`). O WebKit também dá origem opaca a cada
     arquivo (`tests/volta-origem.mjs:1412`). Ali o caso afirma a entrada de login, como o de
     `tests/volta-origem.mjs:1489`, e não tenta marcar a grade: a grade marcada é prova da origem `http`.
   - Registre o módulo nos dois runners.
4. "A cada publicação": o push na `main` já cobre (decisão 5a).

**Pronto quando.** O runner WebKit não aborta com uma falha isolada; o caso de login passa várias vezes seguidas;
a Lei seca roda em `http` e `file://`; e a grade marcada se prova em `http`, enquanto em `file://` o caso afirma a
entrada de login.

**Cuidado.** Não renomeie o job (check exigido). Não adote `@playwright/test` (dependência nova sem pedido). Clique
pelo DOM dentro de `page.evaluate`, porque o app re-renderiza a cada tique. A área precisa ser `juridica` para as
14 leis embutidas. Mudança só de teste: não precisa de build.

### Item 6 — Banco de espelhos

**Verificado.**
- Fluxo: o bloco `const D = {...};` de `banco-espelhos.html:91` (JSON de cerca de 825 KB **numa linha só**) passa
  por `node scripts/build-espelhos.mjs` e vira `espelhos.js`.
- Regerado em memória, `espelhos.js` sai idêntico ao versionado, tirando a data, e
  `JSON.stringify(JSON.parse(D))` devolve a linha igual, byte a byte.
- Nenhum script escreve `D`: `nEsp`, `tribs`, `anos`, `discs`, `tipos` e `naoLoc` são mantidos à mão.
- O gerador só valida a presença do bloco (`scripts/build-espelhos.mjs:14`).
- Cada quesito tem 18 campos, com `pont` literal da banca.
- Os 35 "não localizados" são texto livre em `D.naoLoc`. Ficaram para rebuscar TRF2 XIX ("Em breve"), as sentenças
  do LI Concurso do TJ-RJ, TJ-BA 2026 e TJ-PE 2026; e como "vista individual" TJ-SC 2022–2025, TJ-CE 2025, TJ-PR
  2025, TJ-MS 2025 e TRF6 (o TJ-PR 2023 diz só "segue sem espelho público").
- Nada no repositório registra busca depois de 20/08.

**Faça.**
1. Levante, nas páginas oficiais, os concursos de magistratura (TJs e TRFs, decisão 6b) que publicaram espelho
   entre 21/08/2026 e hoje. Comece por `docs/roadmap.md:16–17` e pelas entradas acima. **Regra inviolável:** quesito
   só entra com o PDF do espelho aberto e lido; pontuação nunca se inventa; URL só entra se foi vista na página
   oficial. Os PDFs da VUNESP só abrem no navegador: não contorne o bloqueio.
2. Por script no scratchpad (fora do repositório):
   1. faça o parse de `D`;
   2. acrescente as linhas **no fim** de `D.rows`, na ordem do PDF, com `pont` literal;
   3. acrescente as `D.instr` correspondentes;
   4. atualize `nEsp`, `tribs`, `anos` (crescente), `discs` (reuse a grafia existente) e `tipos`, e use uma grafia
      de `tipoRaw` que já existe (há 9). Ela entra no id, decide se duas sentenças viram uma prova ou duas e precisa
      conter "discursiva", "sentença" ou "peça" para a prova aparecer nos filtros (`treino.js:798–799`);
   5. reescreva `D.naoLoc` registrando o que foi procurado sem espelho, com data;
   6. grave `JSON.stringify(D)` na mesma linha, terminada em `;`.
3. Rode `node scripts/build-espelhos.mjs` **uma vez**, no fim: ele carimba `meta.gerado` com a data do dia. Confira
   o total de cada prova contra a nota máxima do edital e revise os quesitos que saírem como incertos (hoje 89), sem
   reescrever `pont`.
4. O "2021 a 2025" do título e do subtítulo de `banco-espelhos.html` (linhas 4 e 72) já está defasado: o banco tem
   uma prova de 2026 (a discursiva do TJ-RJ), e `D.anos` vai até 2026. O PR #259 troca as duas linhas para "2021 a
   2026". Se ele não tiver entrado, ajuste o intervalo ao ano mais novo de `D.anos`.

**Pronto quando.** Teste `node:test` de coerência:
- `meta` igual aos arrays;
- `D.nEsp` igual ao número de grupos `trib·ano·tipoRaw`;
- todo `disc`, `tipo`, `trib` e `ano` nos arrays auxiliares;
- URL `https` em domínio oficial;
- `pont` não vazio;
- as provas antigas com o mesmo número e a mesma ordem de quesitos (os veredictos são guardados por índice).

Nenhum teste fixa 36 nem 586. Devolva a lista do que entrou e do que foi procurado sem espelho público.

**Cuidado.**
- Os dois builds passam `verificarPII` em tudo o que publicam, `.js` incluído, e abortam (`scripts/build.mjs:494`;
  `scripts/build-macos.mjs:162`). Um CPF válido copiado de um espelho derruba os dois: transcreva o quesito sem
  dado pessoal.
- Os casos de `tests/run.mjs:4274` e `6043` pegam uma prova de `CT_ESPELHOS.provas` (ordenada por ano decrescente):
  confira se a prova nova muda o alvo deles.
- A discursiva TJ-RJ 2026 está como "Banca própria", mas os links e o texto dizem VUNESP: confira na página
  oficial antes de copiar o padrão.

Nunca insira nem reordene quesito de prova antiga. As instruções vão pela chave `trib ano`, e duas
provas do mesmo tribunal e ano as compartilham. Rode o gerador num caminho sem espaço nem acento: ele usa
`new URL(import.meta.url).pathname`. O `espelhos.js` maior pode estourar o teto de 14 MiB do acervo offline (U10,
`tests/run.mjs:571`) se nem o PR #253 nem o #260, que traz a mesma subida, tiver entrado. A fusão para a Redação e o Simulado nativo é outro banco
(decisão 6a).

### Item 7 — Versão visível

**Verificado.**
- Na camada web, a versão aparece num lugar só. O app do Mac tem ainda o "Sobre o Cátedra"
  (`mac/Sources/main.swift:2315`), mas ele mostra o número nativo do bundle, não o carimbo. O lugar é Ajustes › Conta › "Versão e suporte" (`Catedra.dc.html:7114`). Ela sai como
  "versão <sha> · <alvo>", sem a data (`buildLabel`, 22240), e, sem carimbo, vira "versão de desenvolvimento".
- Não há rótulo de versão em rodapé nenhum.
- O carimbo `{versao, data, alvo}` nasce em `scripts/build.mjs:174` e em `scripts/build-macos.mjs:83` e só entra no
  `index.html` (`build.mjs:316`; `build-macos.mjs:119`). As páginas estáticas saem cruas. A data sai em **UTC**:
  um build às 22h30 de Brasília carimba o dia seguinte.
- `p_build` leva só o sha (`Catedra.dc.html:14584`), lido na hora do envio.
- Não há registro de qual rótulo "chegava vazio". Hipóteses que o código sustenta: um rótulo em página estática
  dependendo de `window.CATEDRA_BUILD`, que nunca é injetado ali; ou uma chave `{{ }}` fora do `render()`, que o
  runtime pinta vazia em silêncio (`support.js:511`).

**Faça (decisões 7a a 7c).**
1. Tire o carimbo para um módulo puro compartilhado pelos dois builds: sha da Vercel, depois do git, depois
   `local`; data no fuso America/Sao_Paulo.
2. Ajustes mostra versão, data e alvo.
3. Rodapé: na base do menu lateral, junto do selo de sincronização (`Catedra.dc.html:837–845`). Nas páginas
   públicas, use um marcador explícito, trocado **só na cópia** que vai para `public/` e `mac/build/web`; o build falha
   se o marcador não existir.
   - Não grave sha e data nos arquivos versionados da raiz: cada build e cada `npm test` sujariam o repositório.
   - `scripts/build-juridico.mjs` regrava `termos.html` e `privacidade.html` na raiz a cada build (linha 164), e o
     rodapé deles nasce em `montarPagina` (linha 153): o marcador nasce ali.
   - Como a suíte serve a raiz (`tests/_infra.mjs:26`), o marcador da raiz pinta um texto legível (por exemplo,
     "versão de desenvolvimento"), nunca o marcador cru.
4. A fila de erros guarda o build no momento da captura, e `p_build` vai como `sha · AAAA-MM-DD` (cabe em 40).
   Faça depois do item 1, porque mexe na mesma chamada.

**Pronto quando.**
- Teste `node:test` do módulo do carimbo: um relógio fixo em 25/11 às 22h30 de Brasília dá 25/11.
- Depois do build, `public/index.html` e as páginas públicas trazem a mesma versão e data, sem marcador sobrando.
- No Chromium, o rótulo bate com `CATEDRA_BUILD`, pinta com contraste ≥ 4,5:1 medido e nunca sai vazio.
- No WebKit, a origem `[bundle]` (quando existir) mostra o alvo nativo e a data.

**Cuidado.** Ajustes tem outro rótulo "versão", o dos Termos (7088). A "versão" do service worker é um hash de
conteúdo, outra coisa. A base do menu usa `opacity:.85`: meça o contraste.

### Item 9 — Trecho citado na conferência própria

**Verificado. A premissa do brief vale pela metade.**
- Em `redacao-motor.js`, a regra é "trecho inventado não entra": `temTrecho` e `trechoOuVazio` apagam a citação da
  resposta que não existe no texto. Mas **o quesito continua pontuando**: `interpretar` soma sem olhar o trecho
  (linhas 200–202; conferido com node: trecho vazio e trecho inventado deram 0,3 cada).
- Não existe "frase do espelho" em parte alguma.
- A conferência própria só existe no modo "À mão" (`terminarMao`, `marcarConf`, `registrarConferencia`,
  `Catedra.dc.html:13889–13952`). A resposta fica no papel, e a entrada grava `texto:''`.
- O veredicto é um número por índice em `redConf`, estado só de tela, lido como número em 13923, 13925, 21755,
  21756 e 21765. No espelho em prosa, `redConf.unica` guarda a nota digitada como texto (`onConfUnica`, 13914), e
  `_redConfTemNota` a trata à parte (13904).
- O resultado vai para `catedra:red` e `catedra:redHist`, que já estão em `ARRAY_ID`.

**Faça (decisões 9a a 9e).**
1. Uma função pura nova em `redacao-motor.js`, exportada em `window.CT_REDACAO_MOTOR` e montada sobre `achatar`,
   `limparTrecho`, `temTrecho` e `trechoOuVazio`. Ela recebe nota, frase da resposta, frase do espelho e texto do
   espelho e devolve `{obtido, trecho, trechoEspelho, valido, motivo}`. A soma da conferência vai para o motor e
   deixa de ser duplicada no host. Não copie a normalização para o host.
2. Na conferência, por quesito marcado acima de 0: o campo "Frase da sua resposta", transcrita da folha, e o campo
   "Frase do espelho", conferida com `temTrecho` contra o texto do espelho. Sem as duas, o quesito não pontua e a
   tela diz por quê.
3. Guarde os trechos numa chave de tela **separada** (não ponha objetos em `redConf`). Zere-a em todos os pontos
   que zeram `redConf`: 7747, 13565, 13776, 13900, 13910, 13949, 13960, 15950, 15977, 15992, 16000 e 16144.
   `_redConfTemNota` passa a contar trecho digitado.
4. Grave `trecho` e `trechoEspelho` em `res.quesitos` e mostre os dois no resultado (template da linha 4011).
5. Entrada antiga sem trecho não é recalculada.

**Pronto quando.**
- Teste `node:test` (`tests/redacao-motor.test.mjs`, com passo na CI): nota acima de 0 com as duas frases mantém a
  nota; sem uma delas, `obtido` é 0 com motivo; frase do espelho inventada é recusada; nota 0 não exige trecho; os
  casos atuais de `interpretar` não mudam.
- `tests/redacao-mesa.mjs`, bloco da conferência (que espera nota 8 sem trecho), é atualizado nos dois runners.
- Os campos novos medem 44 px ou mais e contraste ≥ 4,5:1, em claro e escuro.

**Cuidado.** O motor é ES5: nada de sintaxe nova. O render roda a cada segundo por causa do cronômetro: memorize a
validação. A linha de export de `redacao-motor.js` está sendo mudada por outra sessão (PR #265, ramo
`redacao-segunda-leitura`).

### Item 8 — Proteção contra senha vazada: já resolvido à parte; não faça nada

Conferido pelo Claude Code em 25/11 e devolvido à dona:

- O aviso de segurança do projeto confirma a proteção desligada (lint `auth_leaked_password_protection`, nível WARN).
- A organização do Supabase está no plano **free**, e a documentação diz: "Leaked password protection is available
  on the Pro Plan and above"
  (https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- A opção fica nas configurações de Auth, em Providers › Email (`/dashboard/project/_/auth/providers?provider=Email`
  na documentação), não em "Policies".
- Ligar exige mudar de plano: é decisão de dinheiro da dona. Não toque em Auth nem em plano.

### Item 10 — Uma única contagem de espelhos (faça junto com a 1ª parte do item 2, num PR só)

**Verificado.**
- A fonte única é `window.CT_ESPELHOS`, em `espelhos.js`, gerado por `scripts/build-espelhos.mjs` a partir do bloco
  `D` de `banco-espelhos.html`: `meta` com 36 provas e 586 quesitos, gerado em 2026-08-21. Recontados com node, os
  arrays batem com o `meta` (`scripts/build-espelhos.mjs:99–100` calcula `provas: lista.length` e
  `quesitos: D.rows.length`).
- A landing traz `566` e `35` fixos (`sobre.html:92`), vindos da fonte **antiga** `scripts/fontes/espelhos-magistratura.json`,
  que alimenta a fusão em `discursivas.js` (`scripts/build-espelhos-fusao.mjs:5`), e não de `espelhos.js`.
- Os dois builds copiam `sobre.html` sem transformar (`scripts/build.mjs:334`; `scripts/build-macos.mjs:137`). A
  injeção de `CATEDRA_BUILD` só entra no `index.html` (`scripts/build.mjs:316`). Precedente de gerador importado
  pelos dois builds, que regenera HTML versionado na raiz: `scripts/build-juridico.mjs` (`scripts/build.mjs:26`;
  `scripts/build-macos.mjs:31`).
- A aba "Provas oficiais" (`segunda-fase-web.html:261`) já lê `E.meta` em tempo de execução por
  `<script src="espelhos.js">`, que funciona em `file://`. Sem `espelhos.js`, mostra 0 (linha 204).
- A Redação ("Treino escrito", etapa 1) mostra "provas" 631 e "com espelho" 596 (`Catedra.dc.html:3562–3563`,
  `21836–21837`), calculados de `discursivas.js`: todas as carreiras, contando como "com espelho" também o padrão de
  resposta em texto e o PDF. O host não carrega `espelhos.js`.
- O **648** não está no código da Mesa de prova. Foi o tamanho de `discursivas.js` de 20 a 27/08 (17 ids duplicados
  saíram em `eb76949`, e o banco caiu para 631) e um texto fixo tirado em 21/08. Hoje só aparece fixo em
  `pecas.js:3712` e `:3794` ("325 das 648 questões"), no roteiro "Questão discursiva", que abre pela busca do
  host. São os únicos em texto de tela: o `git grep` acha 648 em mais 30 linhas de `pecas.js`, em comentários do
  campo `freq`, contados na base antiga.
- "Mesa de prova" nomeia duas telas: a etapa 2 da Redação (`Catedra.dc.html:3702`) e `segunda-fase-web.html`
  (linha 200).

**Faça.**
1. Uma função pura que conta provas e quesitos a partir de `espelhos.js` (carregado por `vm`), confere com o `meta`
   e acusa divergência em vez de escolher em silêncio.
2. No padrão de `build-juridico.mjs`: um gerador importado pelos dois builds grava os números em `sobre.html` entre
   marcadores estáveis, regenerando o arquivo versionado. Assim o `sobre.html` do repositório já traz o número
   certo, o que importa porque a suíte serve a raiz do repositório e não `public/` (`tests/_infra.mjs:26`), e porque
   `tests/auth-ipad.mjs` carrega o `sobre.html` real.
3. Telas do app: a 2ª fase já lê a mesma fonte; mantenha. Para a Redação e o `pecas.js`, siga o padrão provisório da
   seção 8 (decisões 10a e 10b).
4. Documentos com número escrito à mão passam a citar a fonte, não o número: `PRODUCT.md:64`,
   `.impeccable/surfaces/sobre-html.md:14`, `docs/especificacao-melhorias.md:163`. O PR #259 reescreve `PRODUCT.md:64` com "586 quesitos de 36
   provas", e um teste dele exige esse texto: se ele entrar antes, ajuste esse teste junto.

**Pronto quando.**
- Depois de `node scripts/build.mjs`, `public/sobre.html` mostra os números de `espelhos.js`; depois de
  `scripts/build-macos.mjs`, `mac/build/web/sobre.html` também. Nenhum `566` sobra no `sobre.html`.
- Nenhum teste fixa 36 nem 586 (o item 6 muda esses números): os testes comparam com a contagem lida do arquivo.
- Teste sem navegador da função de contagem: com o `espelhos.js` real; com `{provas:[...], meta:{}}` (a forma do
  arquivo falso de `tests/oral-pontos.mjs:123`), sem quebrar; e com `meta` divergente, acusando.
- Chromium: o primeiro ladrilho do `.mosaico` de `/sobre.html` mostra os números e pinta de verdade (caixa maior
  que zero, contraste calculado ≥ 4,5:1, captura olhada). WebKit: em `tests/auth-ipad.mjs`, origem `file`, o
  `sobre.html` embutido mostra o mesmo número.

**Cuidado.**
- Há outros dois "35": `sobre.html:93` ("35 leis embarcadas", não é espelho) e `meta.naoLocalizados = 35`
  (concursos sem espelho público). Não troque "35" às cegas.
- Dois testes escondem o `sobre.html` para provar que o build aborta nomeando o arquivo (`tests/run.mjs:347–355` e
  `493–508`). O gerador novo precisa tolerar a ausência, senão estoura `ENOENT` antes da mensagem esperada.
  `tests/run.mjs:3711` exige a string `'sobre.html'` nas listas de cópia dos dois builds: mantenha-a lá.
- `scripts/build-espelhos.mjs` carimba `meta.gerado` com a data do dia: rodá-lo só para recontar gera diff.
- `tests/oral-pontos.mjs:123` serve um `espelhos.js` falso com `meta:{}`: a 2ª fase não pode passar a exigir `meta`.
  Cuide do plural ("1 provas").

### Item 11 — Não prometer leitura de manuscrito por foto (faça depois dos itens 2 e 10)

**Verificado.** Hoje não existe promessa nem função de ler por foto uma resposta manuscrita, em nenhum alvo:
- A landing não fala de foto, câmera ou manuscrito (o cartão "Segunda fase" é `sobre.html:108–112`).
- No host, as únicas entradas de arquivo são o backup em JSON (`Catedra.dc.html:13506`) e o padrão de respostas em
  PDF ou TXT (`Catedra.dc.html:15993`), lido pelo PDF.js, sem OCR. Nenhum `accept` de imagem, `capture`,
  `getUserMedia` ou `mediaDevices` no código web; nenhuma permissão de câmera ou fotos nos nativos.
- `api/complete.js` lê do corpo só `prompt` (53), `model` (68–69, recusado se estiver fora da lista), `max_tokens`
  (77) e `temperature` (78), nenhum campo de imagem. Anthropic, AI Gateway e Gemini recebem só o texto do `prompt`
  (linhas 101, 152, 204).
  O shim web (`scripts/build.mjs:216`) e as pontes nativas mandam só `{prompt}`.
- O "Prompt 2" e o seu item 10, que o brief usa como condição para a trava cair, não estão no repositório nem no
  `Brief.pdf` (lá os "Pedidos prontos para o chat" estão recolhidos).

**Faça.** Nada a remover. Crie a trava que mantém isso:
1. `tests/sem-promessa-foto.test.mjs` (node:test, sem navegador): varre `sobre.html` sem comentários, `Catedra.dc.html`,
   os 7 satélites e `novidades.js` com uma regex combinada (um termo de imagem perto de um termo de resposta, na
   mesma linha). Exige zero casamentos e traz controles: casa "Tire uma foto da sua resposta manuscrita"; não casa
   "o PDF do espelho é imagem digitalizada — não deu para transcrever", "A prova é manuscrita: treinar à mão rende
   mais." nem "tira a primeira foto do resumo". Deixe os acervos de conteúdo jurídico de fora, como
   `tests/sem-mapas-mentais.mjs`. No mesmo arquivo: os únicos `accept` do host continuam sendo JSON e PDF/TXT.
2. Ligue o arquivo como passo próprio na CI (junto de `.github/workflows/testes.yml:27–30`) e na suíte por
   `spawnSync` (padrão de `tests/run.mjs:4077`).
3. No navegador: `document.body.innerText` da landing e da Redação em "À mão" não casa a regex (pega promessa
   quebrada por tag); em `tests/redacao-mesa.mjs`, bloco `espelho()` (linha 232), o `accept` do "Importar PDF/TXT"
   continua `application/pdf,.pdf,text/plain,.txt`.

**Cuidado.** Não apague "A prova é manuscrita: treinar à mão rende mais." (`Catedra.dc.html:3821`;
`tests/redacao-mesa.mjs:141` exige `/manuscrita/`) nem os avisos de "escaneado" e "imagem digitalizada", que falam
dos PDFs da banca. O item proíbe prometer foto, não falar de manuscrito. Palavra solta dá falso positivo ("foto" de
widget, "fotografia" de perícia, "scan" dentro de "buscando"). Mudança só de teste: não precisa de build.

## 7. Ordem dos PRs e conflitos

1. **PR 0, só de teste (desvio recomendado):** a estabilização do runner WebKit do item 5 (`try/catch` e
   sincronização de `tests/login-leitores-web.mjs`). O check exigido cai sem relação com a mudança e bloquearia
   todos os outros PRs.
2. **Item 1.**
3. **Itens 2 e 10 num PR só:** a contagem no build e o texto da Segunda fase. A linha de preço (**PR 2c**, já
   decidida: a landing mostra o preço) e a pergunta com a migration e a Política (**PR 2b**, que espera a decisão
   2b) ficam à parte, por causa do PR #259.
4. **Item 3:** depois do 2+10, porque mexe em `sobre.html`.
5. **Item 4.**
6. **O resto do item 5.**
7. **Item 6:** depois do PR #253 ou do #260 (os dois sobem o teto), ou conferindo o U10. Se o PR 2+10 já tiver entrado, o build regrava o
   `sobre.html` da raiz com os números novos de `espelhos.js`, e o PR do item 6 leva esse arquivo junto. O #259 mexe
   no título de `banco-espelhos.html`.
8. **Item 7:** depois do 1 (mesma chamada em `Catedra.dc.html:14584`) e do 2+10 (mesmos laços de cópia dos builds).
9. **Item 9.**
10. **Item 11:** por último. Ele varre o `sobre.html` final e estende o mesmo teste da linha 3705.

Arquivos que vários itens mudam:
- `sobre.html`: itens 2, 3, 10 e 11, o PR #266 e o worktree `juridico-lgpd-retencao`.
- `tests/run.mjs:3705` (bloco P15): itens 2 e 11 e o PR #266.
- Laços de cópia de `scripts/build.mjs` e `scripts/build-macos.mjs`: itens 10 e 7.
- `PRODUCT.md` (linha 72) e `.impeccable/surfaces/sobre-html.md`: itens 2 e 10 e o PR #259, que já reescreve a
  regra do preço.
- `entrar_lista_espera`, a migration dela, a Política, `juridico.js` e `privacidade.html`: PR 2b, item 3, PR #259 e o worktree `juridico-lgpd-retencao`.
- `banco-espelhos.html` (título e subtítulo, linhas 4 e 72): item 6 e PR #259.
- `tests/redacao-mesa.mjs`: itens 9 e 11 e o worktree `retomar-mesa-discursiva`.
- `scripts/build.mjs` e `scripts/build-macos.mjs`: também o PR #259 e o worktree `quesitos-perdidos`.
- `redacao-motor.js`: item 9 e o PR #265 (`redacao-segunda-leitura`).

Cada PR parte da `origin/main` mais nova. Quando um entrar, atualize os seguintes.

## 8. Perguntas para a dona, com o padrão provisório

Mande numa mensagem só. Enquanto ela não responde, siga o padrão, que é reversível, e marque "provisório" no PR.
Para o que exige o sim (banco vivo, telemetria, instalação, merge), prepare e espere.

| # | Pergunta | Padrão provisório |
| --- | --- | --- |
| 1a | Ligar a telemetria em produção? Liga também a contagem de uso por tela. A Política já cobre (linhas 28 e 41), mas `docs/pedidos-claude-code.md:438` diz "ligar só depois de atualizar a política". | Não ligar. Prepare a prova e espere o sim. |
| 1b | Quando o servidor devolve `false`, o item sai da fila? | Não: fica na fila e o envio para. |
| 1c | Contador exato (RPC nova, migration) ou derivado da lista? | Derivado da lista, com "200+" no teto. Sem migration. |
| 1d | Capturar erro dos satélites e os que o `support.js` engole? | Fora deste PR (amplia a coleta). Registrar como pendente. |
| 2a | A landing ganha a linha "R$ 197 por ano" do brief, se o PR #259 declara em `PRODUCT.md` um preço único ("R$ 197 por um mês de acesso, pagamento único") para o banco de espelhos? São duas ofertas com termos diferentes. | **Decidida pela dona em 25/11: sim, a landing mostra o preço.** PR 2c separado, com "Quando abrir, R$ 197 por ano (valor previsto, pode mudar)." na caixa `.honesto` (`sobre.html:135`) e a exceção escrita só para essa linha e o seu aviso de hipótese (item 2). Não bloqueia o PR 2+10. |
| 2b | Pergunta e opções de disposição a pagar; subir a versão da Política (pede novo aceite a todas as contas)? O PR #259 já a leva a 1.3. | "Você pagaria R$ 197 por ano?" com Sim, Talvez e Não, opcional e sem pré-seleção. PR separado, que espera o sim. A versão da Política é a seguinte à que estiver na `main`. |
| 2c | E-mail que já está na lista: grava a resposta nova? | Não (como hoje, para não permitir troca por quem souber o e-mail). |
| 3a | Honeypot só no cliente ou também no servidor (migration)? | Só no cliente. Isca preenchida mostra o sucesso de sempre e não chama a rede. |
| 3b | Onde o console mostra a lista? | Aba Controle, junto de "Quem pode entrar". |
| 4a | O que é "cobertura como consequência de iniciar"? | A sessão iniciada com tópico grava o vínculo (`edTop`). "Marcar no edital" vem **ligado** só quando o modal abre na tela para a pessoa (`openSession` ou o "Editar" da oferta), e ela pode desligar. Não mude o `marcarEdital:false` de `_freshSessionDraft` nem ligue a marca no rascunho ao iniciar: no Magistratura, o "Registrar" de um toque grava pelo `saveSession` sem modal e fecharia o tópico sem a pessoa ver (regra "abre, não grava sozinho", `Catedra.dc.html:9379`; nota "Registrar minutos não conclui a etapa", 1727). No modo OAB, que só avança por conclusão explícita (`PRODUCT.md:88`), a marca fica desligada. A oferta de um toque grava o vínculo e não marca concluído. |
| 4b | Quem não tem edital, ou a disciplina sem tópicos? | Não trava: escolhe a disciplina e o app convida a cadastrar o edital. |
| 4c | Quais portas passam pelo portão? | Todo início novo. Bloco do Ciclo ou do Magistratura com tópico já vale. Retomar nunca pergunta. |
| 4d | Como contar os "três toques no iPad"? | A partir do Início: Iniciar, escolher o tópico, começar. |
| 4e | ⌘K busca tópico em geral? | Sim: tópicos do edital entram na paleta, e escolher um inicia o cronômetro nele quando ele está zerado. Com o cronômetro em uso, abre o registro da sessão atual e avisa, sem trocar o tópico nem zerar o tempo (`Catedra.dc.html:12720`). |
| 5a | "A cada publicação" é cada merge ou cada deploy da Vercel? | Cada merge (o push na `main` já dispara). Deploy exigiria conta de teste e segredos. |
| 5c | Estabilizar o teste instável de login dos leitores? | Sim, no PR 0, só de teste. |
| 6a | As provas novas vão também para a Redação e o Simulado nativo (fusão)? | Não: só `espelhos.js`, como pede o brief. |
| 6b | Escopo da coleta. | TJs e TRFs, FGV incluída (já há 19 provas dela, e `docs/roadmap.md:30` e `:34` a tratam como alvo). Trabalho e Militar fora. Ano = ano do espelho. |
| 7a | O que é "versão"? | Sha curto, data (dd/mm/aaaa, Brasília) e alvo. |
| 7b | Qual rodapé? | Base do menu lateral no app e rodapé das páginas públicas. |
| 7c | Formato em `erros_cliente`? | `p_build` = `sha · AAAA-MM-DD`, sem coluna nova. |
| 9a | A IA também passa a zerar quesito sem trecho? Isso muda notas. | Não: só a conferência própria. |
| 9b | Na prova à mão, o que é "frase da resposta"? | A frase curta transcrita da folha (não conferível), mais a frase do espelho, conferida. |
| 9c | "Atendido" é qualquer nota acima de 0? | Sim. |
| 9d | Espelho em prosa, com nota única? | Isento. |
| 9e | O simulado de 2ª fase (`segunda-fase-web.html`) entra no item 9? | Não. |
| 9f | O corretor local sem IA do modo Digitar (`_redFallbackLivre`, `Catedra.dc.html:16224`) entra no "na correção sem IA" do brief? Ali as duas frases seriam conferíveis. | Não neste PR: só a conferência à mão. Fica como pendente. |
| 10a | O "com espelho" da Redação (596, de `discursivas.js`, todas as carreiras) vira a contagem de `espelhos.js`? | Não: mantém a base e troca o rótulo para "com padrão de resposta". |
| 10b | O "325 das 648 questões" de `pecas.js:3712` e `:3794`. | Tirar o número fixo do texto. |
| 10c | De que tela e aparelho veio o "648 da Mesa de prova"? | Pergunta só: não está no código atual. |
| 11a | O que é o "item 10 do Prompt 2"? | A trava vale sem prazo até a dona dizer. |
| X1 | Quem builda e instala no Mac e no iPad depois dos merges? | Não instalar. Perguntar. |

## 9. Devolução

Ao fim de cada PR, e no fim de tudo, devolva para cada item:
- o que encontrou;
- o que mudou (arquivos);
- como verificou (comando ou teste, com o resultado);
- o que ficou pendente;
- o link do PR e o estado da CI.

Escreva "não verifiquei" onde for o caso. No fim, junte numa lista só o que espera o sim da dona.

## Anexo A — brief e adendo (texto literal da dona)

Contexto: Cátedra (catedra-plataforma.vercel.app), app em Catedra.dc.html + módulos (auth.js, fsrs.js,
leitura-ativa.js, enam.js, redacao-motor.js, espelho-sugerido.js, casos.js, sw.js, support.js, espelhos.js),
Supabase (projeto catedraplataforma, tabela user_data com um JSON por conta, RPCs SECURITY DEFINER) e funções Vercel
(/api/complete, /api/sentinela, /api/tts). Diagnóstico de 25/11/2026: 13 contas, 2 ativas em 7 dias, lista_espera
com 0 linhas, erros_cliente com 0 linhas, ai_uso com 30 chamadas de uma conta só, espelhos.js com 36 provas e 586
quesitos gerado em 21/08.

Regras: não começar antes de 30/11 (ENAM em 29/11). Não criar funcionalidade fora desta lista. Cada módulo puro novo
ou alterado precisa de teste sem navegador, como redacao-motor.js. Não inventar: se não conseguir verificar, dizer
que não verificou. Para cada item, devolver: o que encontrou, o que mudou (arquivos), como verificou (comando ou
teste), o que ficou pendente.

(A trava "não começar antes de 30/11" foi levantada pela dona em 25/11: "Pode começar já".)

Itens, nesta ordem:

1. Registro de erros do cliente. Conferir se window.onerror e unhandledrejection chamam a RPC
   registrar_erro_cliente(p_build, p_alvo, p_tela, p_mensagem, p_ts) com usuário logado e enfileiram quando offline.
   Forçar um erro de teste e provar que ele chegou em erros_cliente. Se não chegar, consertar. Adicionar no console de
   administração um contador de erros das últimas 24 h.
2. Landing (sobre.html). Ler o número de provas e quesitos de espelhos.js em tempo de build, em vez de 35 e 566 fixos
   (hoje são 36 e 586). Na seção Segunda fase, dizer que a correção pelo espelho oficial vale para as provas com
   espelho publicado e que, nas demais, o app sugere um espelho por IA, sinalizado; ajustar ou retirar a frase "nada
   de opinião no lugar do critério". Acrescentar uma linha de preço do beta ("quando abrir, R$ 197 por ano", valor de
   hipótese) e, no formulário da lista de espera, uma pergunta opcional de um clique sobre disposição a pagar. Não
   coletar nada além de e-mail, área, essa resposta e data.
3. Lista de espera. A RPC entrar_lista_espera é chamável por anon por desenho. Normalizar o e-mail (minúsculas,
   trim), deduplicar, validar formato e tamanho, e colocar um campo honeypot no formulário. Confirmar que o admin vê a
   lista (admin_lista_espera).
4. Tópico obrigatório ao iniciar o cronômetro, não só ao registrar a sessão depois. Busca com ⌘K, três toques no
   iPad. A cobertura do edital passa a ser consequência de iniciar.
5. Teste WebKit na CI (Playwright, projeto webkit): abrir Fase Oral › Lei seca e afirmar que a lista de leis (chips
   alimentados por CT_LEIS) tem mais de zero itens; abrir o CátedraLEGIS e marcar um elemento da grade. Rodar a cada
   publicação.
6. Banco de espelhos. Levantar quais concursos de magistratura publicaram espelho de correção entre 21/08/2026 e
   hoje, rodar o gerador build-espelhos e regerar espelhos.js. Regra inviolável: quesito só entra com o PDF do espelho
   aberto e lido; pontuação nunca se inventa; URL só entra se foi vista na página oficial. Devolver a lista do que
   entrou e do que foi procurado sem espelho público.
7. Versão visível. Mostrar versão e data do build em Ajustes e no rodapé, lidas do build (ontem o rótulo chegava
   vazio no HTML estático), e registrar esse build na RPC registrar_erro_cliente.
8. Proteção contra senha vazada do Supabase Auth: ligar em Authentication › Policies. Se não tiver acesso ao painel,
   me devolver o passo exato para eu fazer.

Adendo (25/11/2026):

9. Trecho citado na conferência própria. Na correção sem IA, cada quesito marcado como atendido deve apontar a frase
   da resposta e a frase do espelho que sustentam o veredicto; sem trecho, o quesito não pontua. A regra já existe na
   correção por IA (redacao-motor.js): reaproveitar, não duplicar.
10. Uma única contagem de espelhos. Três números circulam (landing 566 e 35; espelhos.js 586 e 36; Mesa de prova
    648). Toda tela e a landing passam a ler o mesmo número de espelhos.js em tempo de build.
11. Na landing e no app, não prometer leitura de resposta manuscrita por foto até o item 10 do Prompt 2 ter resultado.
