# Widgets do Cátedra no Mac, no iPad e no iPhone — desenho

Data: 01/10/2026 · Branch: `widgets` · Pedido da dona: "criar widget do app para mac, ipad e iphone".

## 1. O que a dona decidiu (01/10/2026)

| Pergunta | Decisão |
|---|---|
| O que o widget responde num olhar | Os quatro: **estudar agora**, **contagem para a prova**, **ritmo da semana**, **lei/súmula do dia** |
| O que o toque faz | **Abre no lugar certo.** O widget só mostra; quem grava é sempre o app |
| Onde aparece | **Tela de início/mesa** (pequeno, médio, grande), **tela de bloqueio** (iPhone/iPad) e **extra grande** (iPad/Mac) |
| De onde sai o "do dia" | **O que mais cai em prova**, com a mesma ordem em todos os aparelhos. Súmulas, por falta de dado de prova: **por julgados que as citam**, rotuladas assim |
| Atualização entre aparelhos | **Buscar na nuvem já** (não só o que o aparelho sabia) |
| Abordagem da nuvem | **A — o app publica o resumo, o widget lê por um passe** |
| Grupo de apps na conta Apple | **Claude faz no navegador do app**, com a dona logada e confirmando antes de criar |

Fora do escopo: Live Activity, controles da Central de Controle, StandBy como alvo próprio, botões que gravam no
widget, Windows e web (não têm widget).

## 2. O que já existe e o que muda

- `mac/Widget/` (jul/2026): rascunho WidgetKit nunca ligado. Esperava a conta paga (existe desde 14/08) e foi
  testado só com assinatura ad-hoc, que o `pkd` recusa. Fere o DESIGN.md (emoji 🔥 como ícone, cores fixas).
  **Sai inteiro**, substituído por `widget/`.
- `Catedra.dc.html` → `_widgetPayload()` + `window.catedraWidgetPayload`: alimenta a barra de menu e o cartão
  flutuante do Mac. **Fica como está.** O widget ganha uma função própria, `_widgetResumo()`.
- `mac/Sources/main.swift` → `pushWidgetData()` grava em `UserDefaults(suiteName: "group.com.catedra.desktop")`,
  que é peso morto (memória da assinatura: sem perfil o container é ingravável). **Passa a gravar o resumo no
  grupo novo.**
- `ios/Sources/main.swift` → a mensagem `catedraWidget` hoje só relê o tema. **Passa também a gravar o resumo.**

## 3. Peças e onde moram

### 3.1 Código

`widget/` na raiz, com o MESMO Swift para o Mac e para o iPad/iPhone:

| Arquivo | Papel | Depende de |
|---|---|---|
| `widget/Sources/Resumo.swift` | Modelo `Codable` do resumo (versão 1) + decodificação tolerante | Foundation |
| `widget/Sources/Hoje.swift` | Contas do dia, puras: dias até a prova, revisões de hoje, meta de hoje, semana, ofensiva, envelhecimento, escolha nuvem × local | Foundation |
| `widget/Sources/Cores.swift` | Contraste WCAG e escolha do fundo/texto por cor de matéria | Foundation |
| `widget/Sources/Nuvem.swift` | Leitura do resumo por passe (`URLSession`, 10 s) | Foundation |
| `widget/Sources/Grupo.swift` | Caminhos do grupo de apps por plataforma, leitura/gravação de `resumo.json` e `passe.json` | Foundation |
| `widget/Sources/DoDia.swift` | Escolha do item do dia sobre o recorte embutido | Foundation |
| `widget/Sources/Widgets.swift` | `TimelineProvider`, os quatro widgets + o Painel, o `WidgetBundle` (`@main`) | WidgetKit, SwiftUI |
| `widget/Sources/Telas*.swift` | As views por família | SwiftUI |
| `widget/dodia.json` | Recorte gerado (ver 4.4) | — |

Os arquivos só com Foundation são testáveis por `swiftc` sem WidgetKit (ver 7).

`Grupo.swift` também entra na compilação dos dois apps (o host grava o que o widget lê, pelo mesmo código).

### 3.2 Build

Sem projeto Xcode, no estilo de hoje:

- `mac/build-app.sh` monta `Cátedra.app/Contents/PlugIns/CatedraWidget.appex` (bundle `com.catedra.desktop.widget`,
  `NSExtensionPointIdentifier = com.apple.widgetkit-extension`, `-parse-as-library`, App Sandbox ligado, grupo
  `2ZT3GWTS9Z.com.catedra`). Assina o `.appex` PRIMEIRO e o app depois, sem `--deep`, com hardened runtime +
  carimbo, cada um com o seu entitlement. Até hoje o app sai SEM entitlements (memória da notarização); ele
  passa a levar só `com.apple.security.application-groups` = `2ZT3GWTS9Z.com.catedra` (validation-required, não
  restricted: não derruba o processo nem a notarização).
- `ios/build-ipad.sh` monta `Cátedra.app/PlugIns/CatedraWidget.appex` (bundle plano, `com.catedra.ipad.widget`),
  embute `ios/embedded-widget.mobileprovision`, assina o `.appex` primeiro. App e widget levam
  `com.apple.security.application-groups` = `group.com.catedra`. Como o app é universal, um widget cobre iPad e
  iPhone.
- `widget/dodia.json` é gerado antes por `scripts/build-widget-dodia.mjs` e copiado para dentro do `.appex`.
- O Xcode Cloud continua compilando só o app (o widget é conferido pelos scripts acima).
- Arquivo novo entra nas listas de cópia de `scripts/build.mjs` e `scripts/build-macos.mjs` quando for web
  (regra da casa); os Swift e o `dodia.json` não vão para `public/`.

### 3.3 Identidades e grupos

| | Mac | iPad/iPhone |
|---|---|---|
| App | `com.catedra.desktop` | `com.catedra.ipad` |
| Widget | `com.catedra.desktop.widget` | `com.catedra.ipad.widget` |
| Grupo | `2ZT3GWTS9Z.com.catedra` (prefixo do time: Developer ID dispensa perfil e site) | `group.com.catedra` (exige registro no site + perfis) |
| Container | `~/Library/Group Containers/2ZT3GWTS9Z.com.catedra/` | `FileManager.containerURL(forSecurityApplicationGroupIdentifier:)` |

### 3.4 Conta Apple

1. **No navegador do app** (a dona entra; senha sempre dela): developer.apple.com → Identifiers → App Groups →
   registrar `group.com.catedra`. Claude pede confirmação antes de clicar em criar.
2. **Pela API do App Store Connect** (chave `7XFFNN9L32`, a mesma do registro do iPhone): registrar o bundle
   `com.catedra.ipad.widget`; ligar `APP_GROUPS` nos dois identificadores; gerar perfis de desenvolvimento novos
   para o app e para o widget com o iPad, o iPhone e o Mac. A associação do grupo a cada identificador, se a API
   não aceitar, é feita no mesmo passo do navegador. O perfil atual "Catedra iOS Dev" não tem o grupo e é trocado
   pelo novo em `ios/embedded.mobileprovision`.
3. **Pendente, fora deste trabalho:** perfis de DISTRIBUIÇÃO (TestFlight) com o grupo, quando a dona for
   publicar de novo.

### 3.5 Teste de viabilidade (primeiro passo, descartável)

Antes de qualquer código definitivo, no Mac:

1. um `.appex` mínimo assinado com Developer ID, sandbox e grupo `2ZT3GWTS9Z.com.catedra`, SEM perfil, aparece em
   `pluginkit -m` e na galeria de widgets;
2. o app (sem sandbox) grava `resumo.json` no container do grupo e o widget lê.

Se (1) falhar, o Mac ganha um perfil Developer ID para o widget pela API (`MAC_APP_DIRECT`) e o desenho segue
igual. Se (2) falhar (EPERM, como em `group.com.catedra.desktop`), a alternativa é o app gravar via
`UserDefaults(suiteName: "2ZT3GWTS9Z.com.catedra")`. O resultado vai para este arquivo antes de seguir.

**Resultado (01/10/2026, 22h27):** caminho (a), funciona **sem perfil e sem passo no site da Apple**, com uma
condição que o teste descobriu. Sonda `com.catedra.sonda` + `com.catedra.sonda.widget`, Developer ID, hardened runtime,
widget sandboxed com o grupo `2ZT3GWTS9Z.com.catedra.sonda`, nenhum perfil embutido:
1. o `pluginkit` registrou a extensão e o app (sem sandbox) gravou `sonda.txt` no container do grupo;
2. **mas a extensão não aparecia na galeria:** o processo nascia e caía no arranque (`EXC_BREAKPOINT` em
   `_EXRunningExtension._shared`, antes de qualquer código nosso). Hipóteses refutadas uma a uma: chaves de plataforma no
   Info.plist (continua caindo); entitlements (sem nenhum, continua caindo); falta de perfil (o widget do PDF Expert,
   Developer ID, re-assinado SEM o perfil e sem `application-identifier`, NÃO cai). A diferença real: o binário do Xcode
   entra por `_NSExtensionMain` da Foundation; o nosso, ligado à mão pelo `swiftc`, entrava pelo `main`;
3. ligado com **`-Xlinker -e -Xlinker _NSExtensionMain`**, a sonda passou a se comportar igual ao PDF Expert, apareceu
   na galeria (a dona viu) e o widget leu o arquivo do app: `lido.txt` = "widget leu: ola do app …".

Consequência para o plano: toda ligação do `.appex` (Mac e iOS, e a compilação de verificação do teste) leva
`-e _NSExtensionMain`; o Mac NÃO precisa de perfil Developer ID para o widget.

## 4. Os widgets e o visual

### 4.1 Quadro

Nome na galeria: "Cátedra". Cinco tipos (`kind`), todos `StaticConfiguration`:

| Widget (`kind`) | `systemSmall` | `systemMedium` | `systemLarge` | `systemExtraLarge` | Bloqueio |
|---|---|---|---|---|---|
| **Estudar agora** (`agora`) | matéria do ponteiro, minutos do bloco, barra da meta de hoje | + 2 próximos blocos + revisões vencidas | + a volta inteira, "onde parei" marcado | — | `accessoryRectangular` "Constitucional · 50 min" + meta de hoje; `accessoryInline` "próximo: Constitucional" |
| **Prova** (`prova`) | dias (número enorme), data, concurso | — | — | — | `accessoryCircular` dias |
| **Semana** (`semana`) | anel da meta da semana, horas feitas/alvo | + barras dos 7 dias + ofensiva | — | — | `accessoryCircular` meta de hoje (%) |
| **Do dia** (`dodia`) | — | artigo/súmula (texto curto), diploma, "caiu em N provas" (artigo) ou "citada em N julgados" (súmula) | + texto mais longo + provas em que caiu (órgão, ano), quando artigo | — | — |
| **Painel** (`painel`) | — | — | — | os quatro num quadro (iPad/Mac) | — |

`accessory*` só entram onde existem (iOS/iPadOS); no Mac as famílias são filtradas por `#if os(macOS)`.

### 4.2 Linguagem (vitrine)

- **Estudar agora:** fundo em gradiente na **cor da matéria do bloco do ponteiro**, que o APP resolve pela
  `CT_CORES_RAMO` (fonte única) e manda no resumo (`cor` claro, `corD` escuro). O widget não tem tabela própria.
- **Prova** e **Semana:** cor de destaque e gradiente do **tema escolhido no app** (`--accent` e o `--heroGrad`
  resolvidos), enviados no resumo. Com Holo escuro, o widget sai Holo.
- **Do dia:** sóbrio, para leitura: fundo do sistema, título na cor do ramo, texto em serifa (`.serif`).
- Números em `.system(design: .rounded, weight: .heavy)` grandes (34–56 pt conforme a família), ícones SF Symbols,
  **nenhum emoji**. A ofensiva usa `flame` (símbolo), não 🔥.
- Claro/escuro do sistema respeitados; nada de animação (widget não anima).
- **Contraste medido:** texto ≥ 4,5:1 sobre AMBAS as pontas do gradiente. `Cores.swift` escurece a cor da matéria
  (mistura com preto em passos de 5 %) até o branco passar. Teal (#0D9488), âmbar (#D97706) e oliva (#65A30D)
  não passam no original e são os casos de teste.
- **Baixa estimulação** (`prefs.baixaEstimulacao`): a ofensiva some; gradientes viram fundo neutro do sistema;
  a cor da matéria fica só no título.
- **Modos do sistema:** em `widgetRenderingMode == .accented` (tela de início tingida/transparente) e no
  bloqueio (`.vibrant`), número e título levam `widgetAccentable()`, o resto fica neutro; o gradiente sai.
- **Proibido** (DESIGN.md): faixa lateral colorida, cor de identidade como cor de texto sem contraste, emoji como ícone.

### 4.3 Estados vazios e de erro

| Estado | O widget mostra | Toque leva a |
|---|---|---|
| Sem passe e sem cópia local (nunca entrou / saiu da conta) | "Entre no Cátedra" | tela de entrar |
| Sem data de prova | "Defina a data da prova" | Edital |
| Ciclo vazio | "Monte o ciclo" | Ciclo |
| Área ≠ jurídica (widget Do dia) | "Conteúdo da área jurídica" | Início |
| Resumo com mais de 12 h | conteúdo normal + "atualizado há X" discreto | — |

### 4.4 Do dia

- `scripts/build-widget-dodia.mjs` gera `widget/dodia.json`:
  - **300 artigos** mais exigidos em prova: `incidencia.json` → `provas` (espelhos oficiais de 2ª fase),
    ordenados por número de provas distintas; texto tirado de `leis-seca.js`. Rótulo: "caiu em N provas", com
    `provas:[{orgao, ano}]`.
  - **150 súmulas** (vinculantes, STF e STJ) ordenadas por **quantos julgados do acervo do JURIS as citam**
    (contagem sobre `dados/juris-text`). Não existe no repositório dado de súmula cobrada em prova (os bancos
    `questoes-prova.js`/`questoes-enam.js` não citam súmula; a incidência de verbetes conta julgado, não prova),
    então o rótulo é o honesto: **"citada em N julgados"**, o mesmo sinal que o LEGIS já usa e explica.
    Decisão da dona, 01/10/2026.
  - cada item `{tipo, id, titulo, diploma, ramo, texto, n, rotulo, provas?}`, texto cortado em 600 caracteres.
    Teto do arquivo: 400 KB.
- A ordem é intercalada (artigo, súmula, artigo…) e fixa no arquivo. O item do dia é
  `itens[(diasDesde(2026-01-01)) % itens.count]`, então todos os aparelhos mostram o mesmo no mesmo dia.
- Vale só para a área jurídica (o resumo leva `area`).

## 5. Dados e nuvem

### 5.1 O resumo (versão 1)

`_widgetResumo()` em `Catedra.dc.html` devolve FATOS, não contas do dia:

```
{ v:1, carimbo:<ms do updated_at do user_data>, geradoEm:<ms>, conta:<user id>,   // id cru: crypto.subtle
                                                     // pode faltar em file:// no WKWebView; só vive no grupo do aparelho
  area:'juridica',
  prova:{ data:'YYYY-MM-DD', nome:'TJSP' } | null,
  revisoes:{ atrasadas:N, porData:{ 'YYYY-MM-DD':N, … } },          // próximos 30 dias
  ciclo:{ feitos:N, total:N, proximos:[ { disc, min, cor, corD } × até 8 ] },   // a partir do ponteiro
  metaDiariaMin:N, diasAtivos:['seg',…], metaSemanaMin:N,
  minPorDia:{ 'YYYY-MM-DD':N × últimos 8 dias },
  ofensiva:{ n:N, valeAte:'YYYY-MM-DD' },   // o APP calcula até quando ela se mantém (escudos incluídos)
  prefs:{ baixa:bool, tema:{ accent:'#…', grad:['#…','#…'], escuro:bool } } }
```

Teto: 64 KB (testado). O `_widgetPayload()` antigo segue igual.

### 5.2 Contas do dia no widget (`Hoje.swift`)

Dado `resumo` e `agora` (fuso do aparelho): dias até a prova; revisões de hoje = `atrasadas` + soma de
`porData` com data ≤ hoje; minutos de hoje = `minPorDia[hoje] ?? 0`; meta de hoje em %; semana (segunda a
domingo) somando `minPorDia` contra `metaSemanaMin`; ofensiva = `n` se hoje ≤ `valeAte`, senão 0; envelhecido =
`agora − geradoEm > 12 h`. A timeline tem uma entrada à meia-noite e política `.after(30 min)`.

O dia do widget é o mesmo `_hoje()` do app (meia-noite no fuso local). A regra "sessão de madrugada pertence a
ontem" é de ATRIBUIÇÃO e já vem resolvida: o app manda `minPorDia` com cada sessão no dia em que ele a conta; o
widget só lê as chaves.

### 5.3 Publicação (web → nuvem)

Em `auth.js`, **depois de cada sincronização bem-sucedida**: no sinal `catedra:syncpronto` e após cada `upsert`
do `user_data` que voltou sem `res.error`. O `carimbo` é o MESMO `updated_at` (ms) que acabou de ir para o
`user_data`. Regras:

1. só com sessão (nunca em `_modoLocal`);
2. com espera de 3 s para juntar publicações seguidas;
3. em promessa solta: falha nunca atrasa, trava ou reverte a sincronização; vai para a fila de erros existente;
4. `res.error` olhado antes de `res.data` (armadilha do supabase-js).

### 5.4 Supabase (migração `supabase/migrations/2026-10-01-widget.sql`)

```
widget_resumo (user_id uuid pk references auth.users on delete cascade,
               resumo jsonb not null, carimbo bigint not null, atualizado_em timestamptz default now())
widget_passe  (id uuid pk default gen_random_uuid(), user_id uuid references auth.users on delete cascade,
               hash text unique not null, aparelho text not null, criado_em, usado_em, revogado_em)
```

- RLS ligada nas duas; `revoke all` de `anon` e `authenticated` (acesso só por função).
- `widget_publicar(p_resumo jsonb, p_carimbo bigint)` — `authenticated`. Rejeita > 64 KB. Grava só se
  `p_carimbo >= carimbo atual` (um aparelho atrasado nunca apaga o resumo mais novo).
- `widget_passe_emitir(p_aparelho text) returns text` — `authenticated`. 32 bytes aleatórios em base64url;
  guarda só `sha256`; no máximo 10 ativos por conta (revoga o mais antigo); o passe em claro sai UMA vez.
- `widget_passe_revogar(p_passe text)` — `authenticated`, só da própria conta (usado ao sair).
- `widget_passe_revogar_todos()` e `widget_passes_ativos() returns int` — `authenticated` (Ajustes).
- `widget_ler(p_passe text) returns jsonb` — `anon` + `authenticated`, `security definer`: confere o hash e a
  revogação, devolve `{ resumo, carimbo }` e nada mais; atualiza `usado_em` no máximo uma vez por hora.
- `excluir_minha_conta` já apaga tudo pelo `on delete cascade`.
- **Aplicar no Supabase vivo (catedraplataforma `frcnfqxniwzdyykvgqqu`) só depois de a dona autorizar.**

### 5.5 Passe e cópia local (app nativo → grupo de apps)

- **Passe:** quando `passe.json` falta, ou quando `conta` do resumo difere da do passe (troca 2001 ×
  lanabiatrizz), o host chama `window.catedraWidgetPasse(aparelho)` (nova, na web), que emite com a sessão e
  devolve `{ passe, conta }`. O host grava `passe.json` no grupo.
- **Cópia local:** a cada mensagem `catedraWidget` (já existe nos dois hosts) e no timer de 180 s do Mac, o host lê
  `window.catedraWidgetResumo()` e grava `resumo.json` no grupo; no iOS também ao ir para o fundo. Depois chama
  `WidgetCenter.shared.reloadAllTimelines()`.
- **Leitura no widget:** `POST {SUPABASE_URL}/rest/v1/rpc/widget_ler` com a chave pública (anon) que o app já
  usa, embutida no `Info.plist` do widget pelo build. Fica com o de **carimbo maior** entre nuvem e cópia local e
  grava o vencedor no grupo. Sem rede ou com o Supabase pausado, mostra a cópia local.
- **Sair da conta:** a web revoga o passe deste aparelho (`widget_passe_revogar`) e o host apaga `passe.json` e
  `resumo.json` e recarrega as timelines → "Entre no Cátedra".
- **Ajustes:** uma linha "Widgets ligados em N aparelhos · Desligar todos".
- **Regras da casa:** nenhuma chave `catedra:` nova vai para o `localStorage` (passe e resumo moram no grupo do
  aparelho). Se alguma entrar no caminho, entra no EXCLUDE do sync.

## 6. Toque (links `catedra://`)

Os dois apps registram `CFBundleURLTypes` com o esquema `catedra`. O widget usa `widgetURL` (pequeno) e `Link`
(médio/grande):

| Link | Destino |
|---|---|
| `catedra://ver/ciclo` · `/revisoes` · `/edital` · `/painel` · `/inicio` | aba Cátedra + `window.catedraIr(view)` |
| `catedra://legis/<diploma>/<artigo>` | LEGIS nativo na lei, já no artigo (mesmo casamento de `IncidenciaView.abrirNaLei` + `store.articleUnitID`) |
| `catedra://juris/<id>` | JURIS nativo no verbete (notificação `catedraAbrirVerbeteJuris`, que já existe) |
| `catedra://entrar` | aba Cátedra (o portão de login aparece sozinho) |

`window.catedraIr(view)` (nova, na web) passa por `_podeAbrir`; se a área não tem a tela, cai no Início. No Mac o
handler é `application(_:open:)` e traz a janela para a frente; no iOS, `scene(_:openURLContexts:)` e o caminho de
abertura a frio (`connectionOptions.urlContexts`).

## 7. Testes

- `tests/widget-resumo.mjs` (entra no `run.mjs` e no `run-webkit.mjs`; relógio fixo por `page.clock.install` em
  contexto próprio; semente por `__semente`):
  conteúdo do resumo; ofensiva com `valeAte` (com e sem escudo); baixa estimulação; cores resolvidas pela
  `CT_CORES_RAMO`; tamanho < 64 KB; publicação SÓ após sincronizar e SÓ com sessão (Supabase falso na página);
  falha na publicação não trava a sincronização; sair revoga o passe; `catedraIr` respeita `_podeAbrir`.
- `tests/widget-swift.mjs`: compila os arquivos só-Foundation de `widget/Sources` com um `main` de casos e roda.
  Casos: virada de meia-noite, semana começando na segunda, revisões atrasadas + de hoje, ofensiva vencida,
  "atualizado há X", nuvem × local pelo carimbo, item do dia igual para a mesma data, decodificação de resumo com
  campo faltando. **Contraste:** cada cor da `CT_CORES_RAMO` (extraída do dc.html pelo próprio teste) contra o
  fundo escolhido, ≥ 4,5:1 nas duas pontas. Pula com aviso se não houver `swiftc` (a CI é ubuntu).
- **Capturas:** `widget/Ferramentas/capturas.swift` renderiza cada widget × família × claro/escuro/baixa por
  `ImageRenderer` em PNG; o teste mede a caixa do texto (sem corte) e as imagens são olhadas antes de instalar.
- **SQL:** casos numa transação desfeita, com `set local request.jwt.claims` (padrão da Comunidade): carimbo velho
  não grava, passe revogado não lê, passe de outra conta não lê, > 64 KB recusa, 11º passe revoga o 1º.
- **Aparelhos:** no simulador Claude põe os widgets na tela e captura; depois Mac, iPad e iPhone com a dona.

## 8. Entrega

- Worktree `.claude/worktrees/widgets` (fora do iCloud), branch `widgets`, a partir da `main`.
- **PR 1 — nuvem e resumo:** web (`_widgetResumo`, `catedraWidgetResumo`, `catedraWidgetPasse`, `catedraIr`,
  Ajustes), `auth.js` (publicação e revogação ao sair), migração, `tests/widget-resumo.mjs`. Sem nada visível
  além da linha nos Ajustes. Instalado no Mac/iPad/iPhone (o bundle web vai embutido).
- **PR 2 — widgets nos três aparelhos:** `widget/`, scripts de build, `build-widget-dodia.mjs`, links nos dois
  hosts, `tests/widget-swift.mjs`, remoção de `mac/Widget/`.
- Cada PR: `npm test` e `npm run test:webkit` verdes, commit em português numa frase, merge pelo GitHub
  (`gh pr merge --merge`), build e instalação UM de cada vez.
- **Pontos em que Claude para e chama a dona:** (1) login no developer.apple.com; (2) aplicar a migração no
  Supabase vivo; (3) pôr os widgets na tela do iPad e do iPhone.

## 9. Riscos conhecidos

- **Mac sem perfil:** coberto pelo teste de viabilidade (3.5).
- **Orçamento de recarga do iOS** (~40–70 por dia): `.after(30 min)` + recarga pedida pelo app; se o sistema
  segurar, o widget ainda vira o dia sozinho pelas contas locais.
- **Resumo só muda quando um app abre:** aceito na escolha da abordagem A; todo estudo é registrado num app, que
  publica na hora.
- **Chave anon no widget:** é a mesma chave pública que o app web já expõe; o que protege o resumo é o passe.
