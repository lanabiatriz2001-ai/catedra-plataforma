# Reformulação do CátedraLEGIS e do CátedraJURIS nativos (Mac e iPad)

Data: 25/09/2026 · Situação: aguardando revisão da dona · Escopo: SwiftUI nativo primeiro; web depois, com especificação própria.

## 1. Por que

A dona usa o LEGIS e o JURIS nativos em sessões longas e relatou, em 25/09/2026, cinco queixas:
**muita informação desnecessária**, leitura da lei/verbete cansativa, dificuldade de achar as coisas,
visual datado e sem a cara do Cátedra, e LEGIS e JURIS que não conversam entre si.

O código confirma as queixas (levantamento de 25/09 sobre `mac/vendor/{legis,juris}` e `ios/vendor/{legis,juris}`):

- **Superfície inchada.** A lateral do LEGIS tem 14 itens fixos mais as matérias (`ContentView.swift` ~255–290); a do JURIS tem 21 itens mais as coleções (`SidebarView.swift` ~83–118). Somam 35 entradas de primeiro nível, várias repetidas entre os dois produtos (Plano de leitura, Checklist, Simulado, Prova oral, Favoritos, Novidades, Índice).
- **Dois sistemas visuais.** `AppTheme` (LEGIS, `Theme.swift`) e `Palette` (JURIS, `JurisTheme.swift`) têm raios e cores de situação diferentes; o JURIS usa hex fixos no lugar de `ThemeState.t.ok/warn/danger`.
- **Tipografia sem sistema.** São 648 `.system(size:)` com tamanho fixo no Mac; o miolo das telas fica entre 10,5 e 13,5 pt. As fontes da marca (Spectral, Inter, JetBrains Mono) só existem na web: o nativo usa a fonte do sistema.
- **Cores e emoji soltos.** São 144 cores fixas no Mac e 153 no iPad, 91 `.white/.black` literais e cerca de 26 emojis usados como ícone (🎉 🔥 ✓ ✗ ❓ ❗ 💡 🚩 📌).
- **Forks divergentes.** Mac e iPad têm cópias separadas: 32 arquivos do LEGIS e 35 do JURIS diferem, sem nenhum mecanismo de sincronia.

## 2. Objetivo e critérios de sucesso

As duas telas ficam modernas, **coerentes entre si e com o resto do Cátedra**, e **nenhuma função se perde**:
marcações, leitura ativa, flashcards, revisão espaçada, plano de leitura, checklist, índices, incidência,
simulado, prova oral, mapas mentais, tribunais de contas, atualizações e DOU.

Sucesso significa:

1. **Navegação:** cada produto tem exatamente 4 destinos de primeiro nível, os mesmos nos dois.
2. **Leitura:** o texto de lei ou verbete ocupa a tela; a barra superior tem no máximo 5 controles.
3. **Ponte:** de um dispositivo com jurisprudência ligada chega-se aos julgados em 1 toque, e do verbete chega-se ao artigo citado em 1 toque, nos dois sentidos, voltando ao ponto de origem.
4. **Base visual:** todo o LEGIS e todo o JURIS usam uma única base visual (§4). A contagem de hex e de tamanhos fixos fora dela chega a zero ao fim da entrega 6.
5. **Plataformas:** tudo funciona no Mac e no iPad (deitado e em pé), offline, nas 8 direções visuais e nos modos claro e escuro.

## 3. Decisões da dona (25/09/2026)

| Tema | Decisão |
|---|---|
| Escopo | Nativo primeiro, web depois (especificação separada). |
| Caminho | "A e B": primeiro a pintura nova (base visual + leitor), depois a reestruturação (4 destinos + telas). |
| Leitor | Opção **C, foco total + gaveta de baixo** (maquete `leitor.html`). |
| Conteúdo secundário | **Leitor e gaveta só com fonte primária.** Notas próprias, resumos/roteiros de IA e comentários de terceiros **somem do leitor, mas continuam no app**, fora do caminho. Nada salvo é apagado. |
| Navegação | **Os mesmos 4 destinos** nos dois produtos: Hoje · Acervo · Treinar · Novidades, com a busca ⌘K fixa. |
| Forma da navegação | **A, lateral enxuta** (maquete `navegacao.html`). |

As maquetes aprovadas ficam em `.superpowers/brainstorm/…/content/` na pasta principal do repositório. Elas não são versionadas.

## 4. Base visual comum (entrega 1)

### 4.1 Onde mora

- Pasta canônica: **`ios/vendor/design/`**. O alvo do Xcode Cloud compila `ios/vendor` inteiro, por ser pasta sincronizada; o `ios/build-ipad.sh` também compila `ios/vendor` inteiro. Assim, arquivo novo nessa pasta entra sozinho nos dois.
- `mac/build-app.sh` ganha `DESIGN_SOURCES=$(find "$ROOT/ios/vendor/design" -name '*.swift')` na linha do `swiftc`. **É um arquivo só para os dois alvos**, e não duas cópias.
- As diferenças de plataforma ficam em `#if canImport(UIKit)` / `#else` dentro da própria base (por exemplo, `UIFontMetrics` × `NSFont`).
- `tests/xcode-cloud.mjs` continua passando sem mudança, porque a pasta fica dentro de `vendor`.

### 4.2 Conteúdo

- **Cor.** A cor continua vindo da ponte de tema que já existe (`main.swift`: variáveis CSS computadas → `ThemeState.t`).
  - A ponte passa a enviar também `--ok`, `--warn`, `--danger` e `--info`, e o **nome da direção** (`data-dir`). Isso substitui os hex fixos de `CatedraTheme.ok/warn/danger` e de `Palette`.
  - As cores por ramo e por tribunal viram **uma tabela única**, em `Design/CoresAcervo.swift`. Cada entrada traz a cor-identidade e a variante de texto: a identidade misturada com a tinta a 72 %, equivalente ao `color-mix` do DESIGN.md, com contraste ≥ 4,5:1 sobre `surface`.
  - `scripts/verificar-cores-ramo.mjs` passa a ler essa tabela.
- **Tipografia.** Spectral, Inter e JetBrains Mono são registradas no início do app com `CTFontManagerRegisterFontsForURL(…, .process)` direto dos `.woff2`. Conferido em 25/09: o CoreText registra `Spectral-Regular` a partir do woff2. Os arquivos vêm da pasta `web/fonts` que o bundle já carrega, sem duplicar.
  - A escala tem 5 degraus: `micro` 12 · `corpo` 15 · `titulo` 19 · `display` 26 · `leitura` (escolha da pessoa, padrão 18).
  - Todos os degraus passam por `UIFontMetrics(.body)` no iPad e pela escala equivalente no Mac, com piso de 11.
  - Papéis como no DESIGN.md: Spectral em títulos e no texto de lei e verbete; Inter na interface; Mono só para número de dispositivo, contagem e data.
  - Se o registro falhar, a base cai para `.serif`/`.default` do sistema e registra o erro. A tela nunca fica em branco.
- **Espaço e raio.** A escala de espaço é 4/8/12/16/24/32/48. Os raios são `card`, `interno` e `hero`, derivados de `--radius`, e ficam iguais no LEGIS e no JURIS.
- **Componentes:**
  - `CabecalhoSecao` (título display, sem o ícone em degradê de 46 pt);
  - `LinhaItem` (borda tingida pela cor do ramo a 38 % e lavagem esquerda→direita a 18 %; **sem faixa lateral**);
  - `Chip`;
  - `BotaoPrimario` e `BotaoFantasma`;
  - `EstadoVazio` (título, descrição e ação);
  - `BarraLeitor`;
  - `Gaveta`.
- **Ícones.** SF Symbols. Os emojis usados como ícone saem. O modo "baixa estimulação" continua valendo: sem animação e sem gamificação quando está ligado.

### 4.3 Migração sem quebrar

- `AppTheme` e `Palette` continuam existindo como **apelidos finos** que leem a base nova. Tudo compila no primeiro dia.
- Cada tela migra no seu próprio passo (entregas 2 a 6).
- Ao fim da entrega 6, os apelidos são removidos.

## 5. Leitor único `LeitorFoco` (entregas 2 e 3)

Uma só casca para o artigo do LEGIS e para o verbete do JURIS. Ela substitui o miolo de `LawReaderView` e de `LeitorCheio`/`EntryDetailView` no modo Ler.

- **Barra** (no máximo 5 controles): voltar · onde estou (rótulo do ramo em micro, na cor-texto do ramo, e o título em display) · segmento **Ler / Estudar** · **Aa** (tamanho, família e entrelinha, que hoje ficam em outro lugar) · **⋯**.
- **Texto:**
  - Lei: Spectral no tamanho de leitura, entrelinha ~1,7, coluna de no máximo ~64 caracteres, centrada. Número do dispositivo em Mono, na cor `text3`.
  - Verbete: enunciado ou tese em serifa grande. Uma linha discreta acima traz tribunal, número, data e ramo.
- **Marcação.** O grifo com cor livre sai da barra e vai para a **seleção de texto**: selecionou, aparecem as cores. A leitura ativa (grade de 7 chips) segue o mesmo caminho.
- **Índice:** escondido, aberto pelo ⋯ → "Índice" ou pelo atalho **⌘J** ("ir para art. N"). No iPad abre como gaveta lateral e no Mac como painel flutuante.
- **Sinal de conteúdo ligado:** o dispositivo que tem jurisprudência ganha, ao lado, um número pequeno em Mono (a contagem). Não há faixa, fundo nem ícone.
- **Gaveta de contexto** (a partir de baixo, nos dois alvos):
  - Toque no dispositivo ou no número → a gaveta sobe até a metade. Arrastar para cima deixa em tela cheia; arrastar para baixo ou Esc fecha.
  - No LEGIS, as abas são **Jurisprudência · Remissões**. A fonte é `JurisPorArtigo`, que já existe, mais as remissões atuais.
  - No JURIS, as abas são **Artigos citados · Relacionados**. A fonte de "Artigos citados" é o campo `referencias` do verbete (`JurisEntry.referencias`), convertido em dispositivos do catálogo do LEGIS. **O que não casar com um dispositivo conhecido aparece como texto, sem link. Nada é inventado.** "Relacionados" usa o que `QuadroRelacionados` já calcula.
  - Cada julgado mostra **somente o texto oficial**, com tribunal, número, órgão e data.
  - "Abrir no JURIS" e "Abrir no LEGIS" trocam de aba pela notificação existente (`JurisPorArtigo.notificacaoAbrir`) ou pelo caminho inverso equivalente. A volta preserva a posição de rolagem e o dispositivo de origem.
- **Fonte primária apenas.** Não aparecem no leitor nem na gaveta:
  - as notas próprias (`RichNoteEditor`, `AnnotationsPanel`, `JurisAnnotationsPanel`);
  - os roteiros de IA ("Gerar roteiro de estudo", `CatedraIA`/`AIService`);
  - o comentário de terceiros: `JurisEntry.comentario`, `JurisEntry.observacao` e o conteúdo DOD. A situação oficial do verbete (cancelada, superada), que vem de `situacao`, continua aparecendo na linha de metadados.

  Eles continuam acessíveis em **⋯ → "Minhas notas deste artigo" / "Roteiro com IA"** e na tela **Meu material** (§6). **Nenhum dado é apagado ou migrado.**
- **Estudar** mantém tudo o que o `ArticleStudyView` faz hoje (flashcards, remissões, mapa, índice remissivo, comparação de redações), já na base nova (entrega 6).
- **Larguras:** a mesma gaveta vale para iPad deitado, iPad em pé, Mac e iPhone (`LegisCompacto`/`JurisCompacto`). Na largura compacta, ela abre direto em tela cheia.

## 6. Navegação com 4 destinos (entrega 4)

Os dois produtos têm a mesma lateral escura (`sidebarBg`) com **4 linhas**, na mesma ordem e com os mesmos ícones, e a busca no pé.

| Destino | LEGIS | JURIS |
|---|---|---|
| **Hoje** | Continuar de onde parei · revisões vencidas (flashcards/SRS) · plano de leitura do dia · checklist | Revisar hoje · julgado do dia · plano de leitura de súmulas · checklist |
| **Acervo** | Normas por matéria (vitrine) · favoritos · índice das normas · assuntos · matérias próprias | Tribunais (STF, STJ, TSE, estaduais, contas) · informativos · ramos · índice alfabético · favoritos · coleções |
| **Treinar** | Simulado de lei seca · prova oral · incidência | Simulado · prova oral · prova oral das bancas |
| **Novidades** | Alterações nas normas (com comparação) · Diário Oficial | Verbetes novos dos sites oficiais · informativos novos |

- **Busca ⌘K** fixa no pé da lateral. Ela absorve "Buscar em tudo" e a paleta atual.
- **⋯ → Meu material**, em tela própria, reúne Minhas anotações, Mapas mentais, "DOD & Precedentes" (comentário de terceiros) e os roteiros de IA salvos.
- Os badges ficam só em Hoje (itens do dia) e em Novidades (não vistos).
- **iPad deitado:** a lateral recolhe com o botão que já existe. **iPad em pé e iPhone:** os 4 destinos viram a barra de abas de baixo.
- As rotas que hoje entram por URL ou por mensagem do host (`AcervoEntrada.chegou`, `?q=&volta=1`, `jurisStore.abrirVerbete`) continuam levando ao mesmo conteúdo. Só muda o destino-pai que fica marcado na lateral.

## 7. Telas dos destinos (entrega 5)

- **Hoje.**
  - No topo: "Continuar: <norma>, <dispositivo>" em display, que abre o `LeitorFoco` no ponto exato.
  - Embaixo: revisões vencidas (contagem + "Revisar"), o plano do dia em lista curta e o checklist pendente.
  - **Saem desta tela:** heatmap, metas diárias, ofensiva e os quatro KPIs (`DashboardView`, `JurisDashboardView`). O código continua existindo, sem entrada na navegação. Se a dona quiser algum de volta, ele entra em Meu material.
- **Acervo LEGIS.**
  - Vitrine de matérias em cartões coloridos pela tabela de ramos, com nome em display e contagem em Mono.
  - Ao tocar numa matéria, abre a lista de normas daquela matéria, em `LinhaItem`.
  - O link "Planalto ↗" sai de cada linha e vai para o ⋯ do leitor.
- **Acervo JURIS.**
  - Vitrine de tribunais, **STF e STJ primeiro**, depois TSE, estaduais e contas. Depois vêm Informativos (a grade atual) e Ramos.
  - A lista "Todos os verbetes" passa a ordenar por autoridade (vinculante → precedente qualificado → demais) e, dentro de cada nível, por tribunal (STF, STJ, …) e número. Deixa de começar pela Súmula 1 do TJRO.
- **Treinar** e **Novidades:** poucos cartões grandes, cada um com uma ação e uma linha de estado ("12 alterações não vistas").
- **Estados vazios** com título, descrição e ação em todas as telas.

## 8. Entregas

Uma branch e um PR por entrega. Cada uma só fecha **instalada no Mac e no iPad** (CLAUDE.md).

| # | Entrega | Fecha quando |
|---|---|---|
| 1 | Base visual comum (§4) | A base compila nos dois alvos; as fontes registram; `AppTheme`/`Palette` apontam para ela; o verificador está no ar. |
| 2 | `LeitorFoco` no LEGIS + gaveta Jurisprudência · Remissões | Ler um artigo, abrir a gaveta e ir ao JURIS e voltar, no Mac e no iPad. |
| 3 | `LeitorFoco` no JURIS + gaveta Artigos citados · Relacionados | Ir do verbete ao artigo e voltar; nenhum comentário ou IA no leitor. |
| 4 | Navegação com 4 destinos + Meu material (§6) | As duas laterais com 4 linhas; nenhuma função sem caminho (tabela de rastreio no PR). |
| 5 | Telas Hoje · Acervo · Treinar · Novidades (§7) | Vitrines, JURIS ordenado por autoridade, estados vazios. |
| 6 | Estudar e telas restantes na base; zerar hex/tamanhos fixos; remover apelidos | Contagem do verificador = 0 fora da base. |
| 7 | Web (`legis-web.html`, `juris-web.html`) na mesma linguagem | Especificação própria, escrita depois da entrega 6. |

As entregas 1 e 2 formam a "pintura nova" (o B da dona). As entregas 3 a 6 são o que só o caminho A trazia.

## 9. Como provar (não há XCTest no projeto)

- **`scripts/verificar-design-nativo.mjs`** (novo), com três verificações:
  - **catraca:** conta `Color(hex|red:|.sRGB|white:)`, `Color.<cor fixa>`, `.white/.black` literais e `.system(size:)` fora de `ios/vendor/design/`, por alvo, e falha se a contagem subir em relação a `scripts/design-nativo-base.json`, que é atualizado só para baixo;
  - **contraste:** calcula o contraste de cada cor-texto da tabela de ramos sobre `surface`, nos modos claro e escuro, com mínimo de 4,5:1;
  - **emoji:** falha se aparecer emoji como ícone.

  O script entra na CI junto com o `verificar-cores-ramo.mjs`.
- **Rastreio de funções:** o PR da entrega 4 traz a tabela "item antigo da lateral → novo caminho" para as 35 entradas. Nenhuma pode ficar sem caminho.
- **Build e captura:** `bash mac/build-app.sh` e `bash ios/build-ipad.sh` (simulador), com capturas abrindo direto na aba (argumentos `-abaLegis` / `-abaJuris`).
  - Direções: `sutil` e uma escura (`terminal` ou `premium`), nos modos claro e escuro.
  - Tamanhos: iPad deitado e em pé.
  - As capturas vão no PR e são **olhadas**, não só anexadas.
- **Suíte web:** `npm test` e `npm run test:webkit` sempre que o bundle web ou a ponte do `main.swift` mudarem. A ponte de tema é JS injetado.
- **Instalação** no Mac (`/Applications`) e no iPad da dona ao fim de cada entrega.

## 10. Riscos e como tratar

- **Forks Mac × iPad.** A base visual passa a ser uma só, mas as telas continuam em duas cópias. Cada entrega altera as duas e confere a mesma captura nos dois alvos. A unificação das telas **não** está no escopo.
- **`referencias` em formato livre.** O conversor para dispositivos cobre os padrões que existirem no acervo (medidos na entrega 3). O que não casar aparece como texto, sem link, e a taxa de casamento é informada no PR.
- **Fonte no iPad.** O registro por woff2 foi conferido no macOS; no iPad, é conferido na entrega 1. Se falhar, a queda para a serifa do sistema está prevista (§4.2) e a entrega registra o problema.
- **Hábito da dona.** Itens saem da lateral. A tabela de rastreio (§9) e a busca ⌘K garantem que tudo seja encontrável; o PR da entrega 4 lista onde cada coisa foi parar.
- **Sincronização.** Nenhuma entrega cria estado persistente novo. Se alguma precisar (por exemplo, "continuar de onde parei" do JURIS), segue as regras do `auth.js` (`_autosaveKeys`, `ARRAY_ID`, EXCLUDE/rehidratação).

## 11. Fora do escopo

- Unificar LEGIS e JURIS num produto só (caminho C, recusado, porque desfaria as submarcas).
- Unificar as telas Mac e iPad em um só código (só a base visual é compartilhada).
- Mudar dados, acervos, sincronização ou a IA. A IA continua existindo, só sai do leitor.
- A web, que terá especificação própria (entrega 7).
