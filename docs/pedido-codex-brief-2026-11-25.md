# Pedido ao Codex — brief de 25/11/2026 (11 itens)

Este arquivo é o prompt inteiro. A dona cola no app do Codex só a linha abaixo; o resto o Codex lê daqui.

> Leia e siga, do começo ao fim, `docs/pedido-codex-brief-2026-11-25.md` do branch `docs/pedido-codex-brief-2026-11-25`: `git fetch origin && git show origin/docs/pedido-codex-brief-2026-11-25:docs/pedido-codex-brief-2026-11-25.md`.

Preparado pelo Claude Code em 25/11/2026 a pedido da dona (Lana). O texto literal do brief e do adendo está no
Anexo A e manda sobre o resto. As seções 4 a 6 trazem o que foi verificado no código e no banco vivo em 25/11, só
por leitura, por agentes que abriram cada arquivo e por verificadores que tentaram derrubar cada achado. Use isso
como ponto de partida e confira ao abrir: se o código divergir, o código manda, e você registra a divergência na
devolução.

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

<!-- SECOES-PENDENTES: 4 (fatos), 5 (testes), 6 (itens 1–7 e 9), 7 (ordem), 8 (perguntas) -->

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
  `pecas.js:3712` e `:3794` ("325 das 648 questões"), no roteiro "Questão discursiva".
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
   `.impeccable/surfaces/sobre-html.md:14`, `docs/especificacao-melhorias.md:163`.

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
- `api/complete.js:53` lê só `body.prompt`; Anthropic, AI Gateway e Gemini recebem só texto (linhas 101, 152, 204).
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

<!-- ANEXO-PENDENTE -->
