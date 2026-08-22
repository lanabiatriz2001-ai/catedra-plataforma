# Pente fino — 21/08/2026

Quatro auditorias somente-leitura (Cátedra web ×2, LEGIS, JURIS) consolidadas num plano de execução.
Os relatórios completos com linha a linha ficam no histórico da sessão; aqui está o que vira código, na ordem.

## Build B — Cátedra web (bugs + menu + Ajustes)

### Bugs corrigidos
| # | Onde | Problema | Correção |
|---|---|---|---|
| B1 | Edital KPI | "Disciplinas em dia" dividia por nº de tópicos (2/143) | denominador = `edital.length` |
| B2 | Revisões | revisão nascia vencendo no mesmo dia (`due:0`) | SM-2 começa em D+1 |
| B3 | Metas | "Estudar 20 horas" virava 20 minutos | alvo ×60 quando o título diz hora |
| B4 | Conquistas | "Em progresso" esvaziava após o 1º nível | progresso = `!done` |
| B5 | Início | tile "Tempo hoje" somava cronômetro de ontem | guarda `_cronoHoje` |
| B6 | Início | "5 para hoje" escondia 4 vencidas | "4 vencidas · 1 hoje" |
| B7 | Simulado | `encerrarSj` gravava `simAnalysis:'obj'` (inexistente) → Raio-X caía no bruto | `'liquida'` |
| B8 | Prova oral | `_registrarAtividadeAuto` não existia → arguição nunca contava como estudo | registra sessão real |
| B9 | Simulado | input anunciava 10–120, handler travava 5–100 | limites alinhados (10–120) |
| B10 | Menu | LEGIS/JURIS/Roteiros/Prioridade/2ª fase fora de `_moreViews` → nada ativo no menu | lista única |
| B11 | Redação | "648 provas" fixo no texto; toast "cole em ③" (passo extinto) | `{{ bancoTotal }}`; copy certo |
| B12 | Menu | selos "NOVO" eternos | some após 1ª visita |
| B13 | Títulos | subtítulos defasados de Redação e Simulados | atualizados |
| B14 | Faixas de cor | 4 limiares diferentes para a mesma métrica (≥70/50, 70/55, 80/60) | `LIQ_OK=70, LIQ_WARN=55` |
| B15 | Ciclo | cabeçalho fixo "MAGISTRATURA ESTADUAL" | segue objetivo/área |

### Menu lateral (reorganizado por rotina diária)
```
HOJE     Início · Ciclo · Revisões (badge) · Calendário
TREINO   Simulados · Redação (2ª fase) · Prova oral · Roteiros e peças · Prioridade
ACERVO   CátedraLEGIS · CátedraJURIS · Processo · Edital · Bancas
MAIS     Desempenho · Metas · Histórico · Comunidade · Bem-estar · Ajustes
```
Racional: ver o dia → revisar → treinar (o que gera nota) → consultar. O que era "Sistema" (rótulo que não descrevia nada) sobe para Treino/Acervo.

### Ajustes (v3)
- Card "Ajustes de foco" (automação) entra na aba **Estudo** (o texto já prometia isso).
- Backup / exportar / importar / apagar tudo entram na aba **Dados** (estavam soltos fora das abas).
- Bloco "Ajustes avançados do Anki" renomeado para **Flashcards** (a view Anki não existe mais).
- Aba "Método da banca" vira link para a view Bancas (banca em um lugar só).

## Build C — LEGIS + JURIS (Swift, Mac e iPad)

### LEGIS (25 achados) — ordem de unificação
1. `AppTheme`: `rCard/rInner/rHero`, `Typo.num`; matar hex e raios literais.
2. Telas inalcançáveis pela sidebar entram no menu; prova do Simulado não some em 1 clique.
3. Um só `SectionShell` para todas as páginas; `displayFont` (serifa) realmente usado nos títulos.
4. Um card, um chip (hoje 6 receitas de card e 5 de chip).

### JURIS (38 achados) — ordem de unificação
1. `Palette.ok/bad/rCard/rInner/rHero` + `Typo.num`; ~40 hex/raios literais (achados 2, 24–28).
2. Mover componentes soltos para `Components.swift`; `JurisChip(ativo:)` e `SecaoTitulo` únicos; apagar `SectionRule` e `TopBar.swift` (morto).
3. `SectionShell` em Simulado, Oral·bancas, Grade, Julgado do dia, Prova oral, TJROHub, Plano, Mapas, Checklist, Coleção, Novidades.
4. `CartaoJuris(style:)` substituindo 5 variantes; lombada sempre = ramo.
5. `store.ir(_:)` único; Home em 4 blocos (Hoje / Treinar / Acompanhar / Acervo).
6. Bugs: cronômetro que vaza (Timer → `onReceive`), filtros/anotações da Oral que somem ao trocar de aba, `prefix(18)` escondendo disciplinas, `persist()` sem debounce.
7. Sidebar: HOJE · TREINAR · ACERVO · MEU ESTUDO (mesma lógica do Cátedra).

## Áreas de estudo (conteúdo)
- `leis-seca-areas.js`: 35 leis do catálogo oficial, 3.776 artigos, etiquetadas por área (saúde, social, policial, fiscal, contas, administrativa, educação, tecnologia). Entram no Simulado (itens de lei seca) e na Prova oral (modo Lei seca) quando a área escolhida não é a jurídica.
- Lacunas do catálogo (sem fonte oficial no LEGIS ainda): Estatuto dos Militares, Lei Orgânica do TCU, leis orgânicas dos TCEs.

## iPad
- Ícone: `build-ipad.sh` passa a gerar os PNGs (mesmo renderizador do Mac) e a declarar `CFBundleIcons`.

## Publicação
- 21/08/2026 — Build B2 (correção da barra lateral + merge do PR #5) publicado no GitHub; commit assinado pelo GitHub para o deploy da Vercel.
- 22/08/2026 — Login v2 (auth.js) + backup na nuvem pessoal (iCloud Drive no Mac/iPad, Google Drive na web com GOOGLE_CLIENT_ID). Build C (JURIS) pronto no worktree; LEGIS em andamento.
- 22/08/2026 — Build C (LEGIS + JURIS padronizados) integrado e publicado.

## Especificação — Parte 1 concluída (22/08/2026)
Os 7 itens da Parte 1 foram implementados e mesclados: 1 (onde estou fraca), 2 (erro vira revisão),
3 (prova oral em modo arguição), 4 (evolução da redação), 5 (bidirecional nativo), 6 (busca única no ⌘K)
e 7 (o que mudou esta semana). Suíte: 104 casos verdes.

## Lote 22/08 (Partes 2 e 3)
U5 (sync visível), U6 (desfazer), D9 (build sem CDN), D1 (tema único), U3 (continuar de onde parei)
e U1 (iframes vivos) mesclados. Suíte: 164 casos verdes.

## Parte 4 — C1, C2 e C3 (22/08/2026)

### C1 — reprocessamento dos textos de prova + portão
A extração crua publicava, em 267 das 561 provas, o regulamento do caderno no lugar do
enunciado. A receita passou para `scripts/extrair_prova.py`, e o que ela faz, na ordem:

1. **Moldura por frequência** — linha repetida em 3+ páginas é cabeçalho/rodapé. Cortar por
   posição erraria: muita banca põe o enunciado logo abaixo do cabeçalho.
2. **Página que é SÓ regulamento** cai inteira — e só essa. No CEBRASPE o regulamento divide
   a primeira página com o enunciado; derrubar a página inteira apagava a prova (foi o que
   aconteceu na primeira tentativa: `escaneado` saltou de 2 para 18 na amostra).
3. **Corte no marcador de início**, marcador forte antes de fraco. "PROVA DISCURSIVA" aparece
   dentro do próprio regulamento ("…DA PROVA DISCURSIVA, nos locais apropriados…"), então só
   vale quando nenhum marcador forte serve.
4. **Espelho em tabela** via `find_tables()`, célula a célula — e os quesitos estruturados têm
   precedência sobre a prosa da página.
5. **Área privativa da fonte** (`\uf0b7` da FGV) normalizada: é o código Latin-1 somado a
   0xF000. Sem isso, a bolinha do regulamento contava como lixo de codificação e escondia o
   começo da prova.
6. **Boilerplate repetido** ("Obs.: o(a) examinando(a) deve fundamentar…") fica só na primeira
   ocorrência.
7. **Rede de segurança**: se a limpeza derrubar o texto abaixo do mínimo, volta ao estágio
   anterior. Perder o enunciado inteiro é pior que deixar sobrar instrução.

Resultado sobre os 564 PDFs de prova: zero instrução de caderno, zero cabeçalho repetido,
zero marcador interno. Restam 6 escaneados e 12 com fonte codificada — **declarados**, não
publicados (não há Tesseract nesta máquina; o item previa OCR *ou* rebaixar para link com
aviso honesto).

**Quanto custa rodar:** o reprocessamento completo leva ~30 minutos, e quase tudo é
`find_tables()` do PyMuPDF nos 508 PDFs de espelho — medido em 2,15 s por PDF, ~18 min só
nisso; o resto é o arranque do Python uma vez por arquivo. Não é lentidão a consertar às
pressas: é o preço de montar a tabela do espelho célula a célula em vez de aceitar o
`get_text()` embaralhado. Quem for otimizar, o caminho é um modo em lote (um processo
Python para todos os PDFs), não mexer no `find_tables`.

Prova oral: os 186 códigos internos `<<D01_dAdm_…>>` saíram na fonte (`build-oral-conteudo.mjs`)
e o arquivo foi regerado — 999 perguntas preservadas, 0 com marcador.

**Dois defeitos do próprio medidor**, achados no caminho:
- A auditoria media o espelho estruturado com `array.join('\n')` sobre um array de OBJETOS —
  o que dá `"[object Object]"`. Daí os "59 espelhos reprovados por curto". E os
  **"570 provas sem espelho" eram 66**: o `espelhoTexto`/`et` não era contado como espelho.
- O `discursivas-textos.js` era publicado e **nunca lido pelo app** desde o split de 21/08: a
  prova abria com o resumo de 320 caracteres e sem padrão de resposta. Agora há carregamento
  sob demanda ao abrir a prova.

A régua mudou de lugar: `scripts/qualidade-texto.mjs` é usado pelo portão **e** pelo build que
publica. Publicar por um critério e auditar por outro deixaria o portão vermelho sem conserto.

**Honestidade na tela**: o build grava `espelhoSituacao`/`textoSituacao` em cada prova
(`nao-publicado`, `sem-pdf`, `escaneado`, `ilegivel`, `deformado`) e a Redação diz qual é o
caso — "a banca não publicou espelho desta prova" nunca sai com as mesmas palavras de "o PDF
existe e não deu para transcrever".

### C2 — ponte para as plataformas de questões
`plataformas-questoes.js`: mapa único (TEC, QConcursos, Estratégia) com a URL de busca de cada
uma. Botão **Praticar** em três lugares — "onde estou fraca", cada tópico do edital e cada
questão do gabarito do simulado (no gabarito, não durante a prova: durante, seria colar).
Preferência em Ajustes → Estudo, sincronizada. **Só link de saída**: nada é raspado, embutido
ou copiado, e nenhuma credencial passa pelo Cátedra.

### C3 — espelho sugerido
`espelho-sugerido.js` (puro): monta o prompt, interpreta a resposta e **descarta todo quesito
sem fundamento** — artigo, súmula ou tema repetitivo. É o que permite conferir no LEGIS/JURIS
se a IA acertou; sem isso o quesito é opinião com cara de gabarito. Toda saída se declara
("SUGERIDO PELO CÁTEDRA — NÃO OFICIAL"), o cache é por prova e sincroniza (`espelhosSugeridos`
em `_autosaveKeys` e `ARRAY_ID`), e a nota daí sai marcada como **aproximada** no histórico.

## Parte 4 — D11 a D14 (22/08/2026)

**Achado do dia:** os commits `59d1209`, `8f24f4d`, `577bef6`, `b92e2ff` e `b97518f` têm
mensagens que descrevem D11, D12, D13 e D14 como entregues — mas o diff dos cinco é
**só documentação**: 290 linhas acrescentadas em `docs/especificacao-melhorias.md` e zero
linha de código. Conferido no código antes de reimplementar (`focusMode` existia desde
antes, `ajTab` era das abas de 21/08; "sala imersiva", "Personalização avançada",
"escolhas rápidas" e a barra nova não existiam em lugar nenhum). Os quatro foram
implementados agora.

### D12 — a barra do topo
Oito controles no mesmo nível viraram quatro cidadãos + um chip. O bloco inteiro de
cronômetro ("PARADO 00:00" + play + zerar + PiP + "+"), que parecia um segundo app grudado,
virou **um chip**: parado convida ("▶ Focar"), rodando mostra o tempo e a disciplina do
bloco, e pulsa devagar. Clicar abre o poder inteiro — play/pausa, zerar, presets de
pomodoro, PiP, entrar no modo foco e registrar sessão. É casca nova sobre os mesmos
handlers; nenhuma lógica foi reimplementada.
A pílula "Sincronizado na nuvem" saiu do espaço nobre: virou um **pontinho no avatar** e uma
frase no menu da conta. A exceção é erro que **persiste** (>5 min): aí sim vira aviso
vermelho clicável na barra. O selo honesto da barra lateral (U5) continua intacto.
No celular o sino se recolhe para dentro do menu da conta, com o badge junto.

### D13 — a sala de foco
O overlay virou sala: fundo derivado da **cor dela** (radial do accent sobre grafite, não
uma tela preta genérica), cronômetro grande no centro dentro de um **anel** que se preenche
(SVG, sem biblioteca, `stroke-dasharray` de 2πr com r=92), a disciplina do bloco embaixo, e
**três ações discretas** na base: pausar/retomar · encerrar (cai no `finishFocus` de sempre)
· janela flutuante. Ao entrar, uma frase da casa (as `QUOTES` que já existiam) por 3 s.
Teclas: **espaço** pausa e retoma sem sair, **F** entra e sai, **Esc** sai — nenhuma delas
vale enquanto ela digita, senão um espaço no meio da redação pararia o cronômetro.
Os avisos internos são **adiados**, não perdidos: entram numa fila e aparecem ao sair.

### D11 — os Ajustes
Nasce de uso real: a Lana precisou do backup e não achou. Agora:
- **Seis abas por assunto** (Você · Estudo & metas · Método da banca · Aparência · Dados &
  backup · Conta), **grudadas no topo** — rolar não as tira mais da vista.
- **Busca interna** por índice declarado (`AJ_INDICE`), não por varredura da tela: a aba que
  não está aberta **não está no DOM** (é um `sc-if`), então varrer o DOM só acharia o que já
  está à vista. Buscar "backup", "tema" ou "sair" devolve o ajuste e a aba onde ele mora, e
  o clique leva até lá.
- **Aparência**: a personalização visual não perde nada. Em cima, escolhas rápidas e três
  presets (Padrão, Compacto, Conforto de leitura) que preenchem o conjunto; embaixo,
  **"Personalização avançada"** com todos os controles finos de sempre. Mexer num fino marca
  o preset como "Personalizado" — preset é ponto de partida, não gaiola.
- **Automações com nome honesto e frase de efeito**: "Parei o cronômetro → oferece
  registrar", "Estudei um tópico → agenda a 1ª revisão", cada uma dizendo o que muda ao
  desligar ("Desligar: nada entra em Revisões sozinho").
- **Backup automático semanal**: salva sozinho na nuvem pessoal uma vez por semana, mostra a
  data do último e, se o token do Drive expirou, **avisa** — falhar em silêncio seria pior,
  porque ela passaria a confiar num backup que não acontece.
- **Zona de perigo** isolada no fim, em vermelho: "Apagar tudo" estava lado a lado com
  "Importar dados", do mesmo tamanho e cor.

### D14 — a varredura
Três verificações no `npm test`, sobre o texto do template (regex basta, como o item pedia):
todo `data-view` tem uma tela no `render()`; toda view de satélite tem o seu iframe montado;
e nenhuma variável `{{ nome }}` de escopo global fica órfã. Um merge que derrube uma ligação
passa a quebrar o CI em vez de quebrar a tela.

**Na primeira execução ela achou três botões mortos** — handlers que existiam, template que
os chamava, e nada que chegasse ao objeto do `render()`:
| Controle | Onde | O que não funcionava |
|---|---|---|
| `setBancoBanca` | Redação → banco de provas | o filtro por banca não filtrava nada |
| `toggleBancoSoEsp` | Redação → banco de provas | o "só com espelho" não ligava |
| `revelarEspelho` | Redação → espelho guardado | "Ver mesmo assim" não revelava o espelho |
Os três foram religados. É o defeito exato que o item descreve: o dc-runtime resolve
variável ausente como string vazia e não reclama.

