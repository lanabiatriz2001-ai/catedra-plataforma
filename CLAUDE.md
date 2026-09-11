# Cátedra — instruções para quem trabalha neste repositório

Plataforma de estudo para concurso (núcleo: magistratura), em três alvos: web na Vercel,
app de Mac e app de iPad, os dois nativos sobre WKWebView. Português do Brasil em código,
comentários, commits e interface, com acentuação completa.

Leia antes de mexer, nesta ordem: `PRODUCT.md` (o que o produto é e não é), `DESIGN.md`
(o contrato visual), a seção "Regras da casa" de `docs/especificacao-melhorias.md`,
`docs/roadmap.md` e `docs/pedidos-claude-code.md` (a fila de pedidos e as "Decisões
minhas", que só a dona decide). Briefs por tela em `.impeccable/surfaces/`.

## Onde as coisas vivem

- `Catedra.dc.html` — o app inteiro (componente único; `render()` devolve variáveis que o
  template consome com `{{ var }}`, `<sc-if>`, `<sc-for>`). `support.js` é o runtime.
- `catedra-ui.css` — o sistema visual (tokens, componentes, direções). Satélites em
  `<iframe data-ct-frame>`: `legis-web.html`, `juris-web.html`, `ritos-web.html`,
  `pecas-web.html`, `area-web.html`, `prioridade-web.html`, `segunda-fase-web.html`.
  Variáveis CSS não atravessam iframe: os satélites recebem os tokens por cópia.
- `auth.js` — login, sincronização com o Supabase e o merge entre aparelhos.
- `api/` — funções serverless da Vercel (IA, voz, proxy de lei). Chaves só em variáveis
  de ambiente (`.env.example` lista todas). Nenhuma chave entra em arquivo: a CI e o
  pré-commit rodam `scripts/verificar-segredos.mjs`.
- `scripts/` — builds e geradores (`build.mjs` site, `build-macos.mjs` bundle nativo,
  `build-*.mjs` acervos). Dados novos entram como .js/.json gerados por script.
- `tests/` — a suíte (`run.mjs` Chromium, `run-webkit.mjs` WebKit) e os módulos por tela.
- `mac/`, `ios/`, `win/` — hosts nativos. LEGIS/JURIS nativos são SwiftUI de verdade.
- `docs/juridico/` — Termos e Política (.md); os dados do controlador ficam SÓ em
  `docs/juridico/controlador.json`; o build gera `termos.html`, `privacidade.html`, `juridico.js`.

## Comandos

```bash
CT_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test   # suíte Chromium (~13 min)
npm run test:webkit                                                                   # suíte WebKit (Safari/WKWebView)
node scripts/verificar-segredos.mjs                                                   # nenhuma chave no repositório
node scripts/build.mjs                                                                # gera public/ (o que a Vercel serve)
node scripts/build-macos.mjs                                                          # bundle dos apps nativos
mac/build-app.sh · ios/build-ipad.sh                                                  # ao fim de TODA mudança no app: build e instalação nos dois
```

## Regras invioláveis

- Estado novo que deve sobreviver ao fechamento entra em `_autosaveKeys()`; array de
  objetos tem `id` único e carimbo `up` (ms) e entra em `ARRAY_ID` no `auth.js`. Estado só
  de tela NÃO entra. Toda chave `catedra:` nova entra no EXCLUDE do sync ou em
  `_rehydrateFromLocal` — as duas listas se conferem juntas.
- Arquivo novo entra nas listas de cópia de `scripts/build.mjs` e `scripts/build-macos.mjs`.
- Nada de rede externa em tempo de execução, nada de CDN, nada de fonte externa: o app roda
  offline e em `file://`. WKWebView usa JavaScriptCore: sintaxe muito nova quebra em silêncio.
- Sincronização nunca sobrescreve trabalho da pessoa; vazio nunca apaga cheio. Preserve as
  travas do `auth.js` (`supabase-js` NÃO rejeita a promise em erro: olhe `res.error` antes de
  ler `res.data`).
- Design: tokens sempre (sem hex fixo, sem px solto no host); sem faixa lateral colorida; sem
  emoji como ícone (SVG Lucide 16 px, `aria-hidden`); cor-texto ≠ cor-identidade (texto
  ≥ 4,5:1); alvos ≥ 44 px no toque; `prefers-reduced-motion` respeitado. A direção "vitrine"
  é vinculante — design tímido foi recusado.
- Teste que prova aparência MEDE (contraste calculado, caixas, `getComputedStyle`) e olha a
  captura; presença no DOM não prova que pinta.
- Não mude versões de dependências sem pedido.
- Toda mudança que toca o app (web ou Swift) termina **instalada no Mac e no iPad**, sem perguntar.
  Regra da dona, reafirmada em 10/09/2026; vale sobre a linha contrária do "Prompt 0" de
  `docs/pedidos-claude-code.md`. Mudança só de documento ou de teste não precisa de build.

## Fluxo de trabalho

1. Um item por branch e por PR, com casos novos em `tests/`, mensagem de commit em português
   numa frase que diz o que mudou para a pessoa (veja o `git log`).
2. `npm test` e `npm run test:webkit` verdes antes do commit. A CI roda os dois em cada PR.
3. Build e instalação, UM de cada vez (dois builds juntos se atropelam) e sem editar `.swift` durante o
   build: `bash mac/build-app.sh` e copiar `mac/build/Cátedra.app` para `/Applications` (feche o app
   antes); depois `bash ios/build-ipad.sh device` e `xcrun devicectl device install app --device <UDID>
   "ios/build/Cátedra.app"` — o UDID é o do "iPad de Lana Biatriz" em `xcrun devicectl list devices`.
   Mudança só em HTML/JS também exige o build: o bundle web vai embutido nos apps. Erro 4016 no install
   = iPad bloqueado ou fora da rede; tente de novo quando ele voltar, não é defeito do build.
4. Merge pelo GitHub (`gh pr merge --merge`): a Vercel só publica commit **verificado**, de autor ligado
   à conta dela. Commit feito no Mac sai "unverified" e com o e-mail do git local, e o preview do PR
   aparece bloqueado; o merge pelo GitHub publica normal. A `main` exige PR com as checagens verdes.
5. Ao terminar, liste: arquivos alterados, casos de teste novos, o que ficou pendente e o
   que a dona precisa decidir.

## Armadilhas conhecidas

- Semear o `localStorage` com o app aberto é corrida com o autosave (500 ms): semeie a partir
  de `base + '/__semente'` (404 na mesma origem) e só então abra o app. Leia o storage ≥ 1,3 s
  depois de uma ação.
- Teste que depende de "hoje" fixa o relógio (`page.clock.install` em contexto próprio, padrão
  de `tests/registro-sessao.mjs`); sessão de madrugada pertence a ontem por desenho.
- `discursivas.js` é GERADO de `discursivas-completo.js` por `scripts/build-discursivas-split.mjs`.
- Worktree em ~/Desktop ou ~/Documents (iCloud): o File Provider esvazia arquivos parados (`dataless`;
  `find . -flags +dataless`) e ler um deles já voltou com conteúdo errado. `scripts/verificar-pasta-sincronizada.mjs`
  roda antes dos builds e da suíte, devolve do git os rastreados sem mudança e para no resto com o comando.
  Esvaziar muda o `ctime`, então `git status`/`git add` releem (baixam) cada arquivo: rode a checagem antes.
  Worktree que você mesmo cria vai para fora dessas pastas (ex.: `~/catedra-plataforma-main/.claude/worktrees/`).
- Duas sessões no mesmo clone: confira `git branch --show-current` no mesmo comando do
  checkout; o build cruzado cai para assinatura ad-hoc.
- macOS não tem `timeout`; em zsh, `echo =====` vira expansão `=cmd`.
- Repositório em ~/Desktop ou ~/Documents (iCloud): o File Provider marca a raiz do `.app` com
  `com.apple.FinderInfo` e o `codesign` recusa ("detritus"). `scripts/assinar-app.sh` assina numa
  cópia em /private/tmp e confere com `--strict` lá; o bundle que volta é remarcado, então instale no
  Mac com `ditto --norsrc --noextattr --noacl` (Finder e `cp` levam o atributo junto para /Applications).
