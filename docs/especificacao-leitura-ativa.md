# Especificação — Motor de leitura ativa (grade de 7 perguntas)

*Escrita em 02/09/2026 no padrão de `docs/especificacao-melhorias.md`: para quem vai
implementar sem ter visto o código antes. Cada item traz o objetivo, o que **já existe**
(com arquivo e chave de estado reais), o que construir, onde mexer, critérios de aceite e
armadilhas conhecidas. As **Regras da casa** daquele documento valem aqui inteiras —
`_autosaveKeys()`, `ARRAY_ID` + `id`/`up`, listas de cópia do build, casos em
`tests/run.mjs`, nada de rede externa em runtime.*

## Por que este motor existe

Hoje a Cátedra vende acervo (espelhos, discursivas, lei seca, verbetes) e treino (simulado,
oral, 2ª fase). O que ela **não tem em tela** é o método com que a Lana lê a lei: cada
dispositivo respondido por sete perguntas fixas, cada pergunta com a sua cor, um dispositivo
por vez, e cartão de revisão só do que ela errou ou hesitou. A grade aparece apenas como
texto dentro de `oral-conteudo.js`; `grep "Há prazo"` devolve zero no host, nos satélites e
no Swift. Este documento transforma o método em componente.

**A grade (ordem, rótulo, pergunta e cor são fixos e nunca mudam de posição):**

| # | id | Rótulo | Pergunta que a pessoa responde no texto | Cor (identidade) |
|---|---|---|---|---|
| 1 | `quem` | Quem? | sujeito, destinatário, legitimado, competente | azul |
| 2 | `oque` | O quê? | conduta, objeto, efeito, o que a norma manda/permite/cria | verde |
| 3 | `quando` | Quando? | hipótese, condição, momento, marco temporal | laranja |
| 4 | `como` | Como? | forma, procedimento, meio, quórum, requisito formal | rosa/magenta |
| 5 | `prazo` | Há prazo? | prazo, termo, contagem | amarelo |
| 6 | `excecao` | Há exceção? | ressalva, "salvo", "exceto", "não se aplica" | roxo |
| 7 | `proibicao` | Há proibição? | vedação, "é vedado", "não pode", "sob pena de" | vermelho |

"Não há" é resposta válida e registrada para 5, 6 e 7 (e permitida para todas): saber que
o dispositivo **não** tem prazo é conhecimento de prova.

---

## LA1. Modelo de dados e canal host ↔ LEGIS

**Objetivo.** Uma leitura ativa é um registro por dispositivo que sobrevive ao fechamento,
sincroniza entre aparelhos e não guarda o texto da lei (que já vive no acervo).

**O que já existe.**
- O leitor do LEGIS (`legis-web.html`, `renderDoc()` linha 663) já isola cada
  dispositivo como `.gr[data-gi]` — caput, parágrafo, inciso e alínea — e guarda o texto
  de cada um em `disp[gi]`. Os grifos livres vivem em `localStorage`
  (`gKey()` = `'catedra:grifos:'+curLaw.id`, itens `{gi, t, s}`: índice do dispositivo,
  texto marcado, offset). `renderGr(gi)` reaplica as marcas por `s` e cai para `indexOf`
  quando o offset não bate. **Este é o padrão a estender, não a substituir.**
- O host embarca 14 leis em `window.CT_LEIS` (`leis-seca.js`; cada lei `{sigla, nome,
  url, artigos:[{rot, txt}]}`), consumidas pela prova oral e pelo simulado via
  `window.CT_TREINO` (`treino.js`): `proposicoesDoArtigo(txt)` já quebra um artigo em
  proposições `{rot, txt}` (caput; "Art. X, III"; "Art. X, § 2º"), com o tronco do caput
  colado ao inciso. O catálogo do LEGIS (`leis-catalogo.js`, `CT_LEIS_CAT[].u`) e
  `CT_LEIS[].url` compartilham a URL do Planalto — é a chave que liga uma lei do leitor a
  uma lei embarcada.
- Comunicação host ↔ satélite é por `postMessage`; os handlers vivem em `_acervoMsg`
  (`componentDidMount`, Catedra.dc.html ~linha 6288: `ctFlashcards`, `ctErrosSegundaFase`,
  `ctAbrirAcervo`, `ctVoltarAcervo`, `ctIA`…). O tema chega ao iframe pelo mesmo canal
  (D1, `tema-satelite.js`).
- Sync: chaves em `_autosaveKeys()` (~linha 7036) + `ARRAY_ID` em `auth.js` (linha 168)
  para arrays de objetos com `id`/`up`; sufixo `@<area>` já é tratado por `ehArrayId`.

**O que construir.**
1. Chave nova `catedra:leituras` (array; **registrar `leituras` em `_autosaveKeys` e
   `'catedra:leituras': 1` em `ARRAY_ID`**). Item:
   ```js
   { id:'la|'+leiId+'|'+gi,          // estável por lei e dispositivo
     up:1756800000000, v:1,          // carimbo de edição (regras da casa) e versão do shape
     leiId:'https://www.planalto.gov.br/…/constituicao.htm',  // = CT_LEIS_CAT.u = CT_LEIS.url
     sigla:'CF', rot:'Art. 5º, XI', gi:412,
     hash:'3f9a1c2b',                // hash do texto do dispositivo (FNV, como treino.js)
     el:{ quem:[{s:0,t:'a casa'}], oque:[{s:7,t:'é asilo inviolável do indivíduo'}],
          quando:[], como:[], prazo:[],
          excecao:[{s:101,t:'salvo em caso de flagrante delito ou desastre, ou para prestar socorro, ou, durante o dia, por determinação judicial'}],
          proibicao:[{s:40,t:'ninguém nela podendo penetrar sem consentimento do morador'}] },
     nao:['prazo','quando','como'],  // "não há" declarado (diferente de "não marquei")
     conf:[{el:'excecao', q:1, ts:1756800100000}],   // conferências (LA4): q 1=errei 3=hesitei 5=acertei
     lido:1756800000000 }
   ```
   Sem o texto do dispositivo: só `hash` + offsets + trechos marcados (`t`), como os
   grifos. Marca `desatualizada` em memória quando o `hash` do texto atual difere.
2. Módulo puro `leitura-ativa.js` (arquivo novo na raiz; `window.CT_LA`), sem DOM, para
   ser testado fora do app e carregado tanto pelo host quanto pelo `legis-web.html`:
   - `CT_LA.ELEMENTOS` — a tabela acima (`id, n, rotulo, pergunta, tecla:'1'..'7'`);
   - `CT_LA.nova({leiId,sigla,rot,gi,txt})` → item com `hash`;
   - `CT_LA.marcar(item, el, {s,t})`, `CT_LA.desmarcar(item, el, s)`,
     `CT_LA.naoHa(item, el, bool)` — todos devolvem item novo com `up` atualizado;
   - `CT_LA.hash(txt)` (o FNV de `treino.js`, copiado — sem depender de `CT_TREINO`
     carregado);
   - `CT_LA.completude(item)` → `{respondidas, total:7, faltam:[…]}` ("respondida" =
     tem marca **ou** "não há");
   - `CT_LA.cloze(item, el, txt)` e `CT_LA.renderCloze(...)` — ver LA5;
   - `CT_LA.conferir(item, el, q)` → `{item, criar:{fc?, review?, erro?}}` — ver LA4;
   - `CT_LA.progresso(leituras, leiId, totalDispositivos)` → `{lidos, completos, pct}`.
3. Canal (novas mensagens, mesmo `_acervoMsg`):
   - `ctLeiturasPedir {leiId}` (LEGIS → host) → host responde `ctLeituras {leiId, itens}`
     (só os itens daquela lei; nunca o array inteiro);
   - `ctLeituraAtiva {item}` (LEGIS → host): upsert por `id`, preserva o `up` maior
     (o host é a fonte da verdade; o iframe é tela);
   - `ctLeituraConferida {id, el, q, cloze:{front,back,extra}, ref}` (LEGIS → host):
     grava a conferência no item e dispara LA4/LA5.
   O LEGIS mantém um espelho de leitura em `localStorage`
   (`'catedra:leituras:'+leiId`) **apenas para renderizar antes da resposta do host**;
   toda resposta `ctLeituras` sobrescreve o espelho. Em `file://` (nativo) o iframe pode ser
   cross-origin — por isso o espelho existe e por isso a fonte da verdade é o host.
4. Build: `./leitura-ativa.js` entra na lista `casca` de `scripts/build.mjs` (linha ~337) e
   nas listas de `scripts/build-macos.mjs`; o `legis-web.html` passa a carregá-lo por
   `<script src="./leitura-ativa.js">` ao lado de `tema-satelite.js` (linha 238).

**Aceite.** Marcar um dispositivo no LEGIS, fechar o app e reabrir em outro aparelho mostra
a mesma grade (merge por id; editar nos dois aparelhos preserva o `up` maior). Nenhum texto
de lei entra em `catedra:leituras`. `leitura-ativa.js` roda em Node puro
(`node -e "…"`) para os testes.

**Armadilhas.** Offsets quebram quando o Planalto muda a redação: gravar `t` e usar `s`
só como pista (padrão de `renderGr`). Não guardar a leitura dentro de `catedra:grifos:*`
— são coisas diferentes e o merge por id precisa do array próprio. Volume: 1.000 leituras
≈ 0,5 MB no blob de sync — aceitável, mas nunca embutir `txt`. `gi` depende da ordem de
parse de `renderDoc`; se o parser mudar, o `hash` denuncia e a leitura fica
"desatualizada" em vez de apontar para o dispositivo errado.

---

## LA2. A grade no leitor (legis-web.html)

**Objetivo.** Ler um dispositivo é respondê-lo: a pessoa seleciona o trecho que responde a
uma pergunta e toca a cor; a grade preenchida fica visível embaixo do dispositivo, com o
rótulo sempre escrito (nunca cor sozinha).

**O que já existe.**
- Selecionar texto dentro de um `.gr` já abre a barra `_grif` (`mouseup`, linha 731) com
  a ação de grifar; `renderGr` desenha `<mark data-t data-s>`.
- Tokens de tema chegam ao iframe por cópia (D1): a lista de nomes exportados está em
  `tema-satelite.js` (linha 27) e no host (~linha 6165, junto de `--fs-base`). `catedra-ui.css` declara os tokens do host;
  `satellite-base.css` a fundação dos satélites.
- DESIGN.md: cor de identidade é *dado* (`--ct-item-cor`, `--rc`), separada de cor de
  tema e de cor de situação; **cor-texto ≠ cor-identidade** (escurecer antes de virar
  texto, ≥ 4,5:1); proibida faixa colorida lateral; nada em px no host; sem emoji em
  elemento novo.

**O que construir.**
1. **Tokens** (em `catedra-ui.css`, replicados pela ponte D1 — adicionar os 14 nomes às
   duas listas: `tema-satelite.js` linha 27 e host ~linha 6165): `--la-quem`, `--la-oque`, `--la-quando`, `--la-como`,
   `--la-prazo`, `--la-excecao`, `--la-proibicao` (identidade) e `--la-*-tx` (texto,
   derivado: `color-mix(in oklab, var(--la-x) 72%, var(--ink))` no claro e
   `color-mix(in oklab, var(--la-x) 70%, var(--ink))` no escuro; medir 4,5:1 nos dois
   modos e nas oito direções). Valores de partida (claro / escuro): azul `#2563eb`/
   `#60a5fa`, verde `#15803d`/`#4ade80`, laranja `#ea580c`/`#fb923c`, rosa `#db2777`/
   `#f472b6`, amarelo `#ca8a04`/`#facc15`, roxo `#7c3aed`/`#a78bfa`, vermelho
   `#dc2626`/`#f87171`. A identidade **não troca com a direção visual** — é código de
   cor da leitura, como a cor da matéria não troca de tema.
2. **Interruptor "Leitura ativa"** na barra do leitor (ao lado de tamanho de fonte/mapa).
   Ligado: cada `.gr` recebe um **trilho** `.la-trilho` logo abaixo, com 7 chips na ordem
   fixa (`.la-chip[data-el]`), texto = rótulo; chip vazio em `--surface2` com rótulo em
   `--text3`; chip respondido com fundo `color-mix(in oklab, var(--la-x) 16%,
   var(--surface))`, borda tingida 38% (mesma receita de `.ct-item`) e rótulo em
   `--la-x-tx`; chip "não há" com rótulo riscado suavemente e sufixo "— não há".
   Toque no chip preenchido: rola/destaca as marcas daquele elemento; toque longo ou
   segundo toque: menu "não há / limpar".
3. **Seleção → elemento**: com o interruptor ligado, a barra `_grif` ganha os 7 chips
   (mesmo componente do trilho, compactos) além do grifo livre. Toque no chip grava
   `CT_LA.marcar` e pinta a marca com `<mark class="la la-quem" data-el data-s>`
   (fundo 22% da identidade, sublinhado 2px na identidade — o sublinhado é a segunda pista
   além da cor; o rótulo aparece no `title` e no trilho). Teclas `1`–`7` com seleção
   ativa fazem o mesmo; `0` marca "não há" na pergunta em foco do modo guiado (LA3).
4. **Legenda fixa** da grade no topo do leitor quando ligado (`.la-legenda`, 7 chips com
   rótulo + pergunta em `--t-micro`), recolhível; é o "manual" da cor, sempre a um toque.
5. **Renderização**: `renderGr(gi)` passa a intercalar `grifos` e marcas da leitura na
   mesma passada (ordenar por `s`, cortar sobreposição como já faz). Quando o `hash` do
   dispositivo diverge do gravado, o trilho exibe "redação mudou — reveja" e as marcas
   entram em traço pontilhado até a pessoa confirmar ou limpar.
6. **Alvo de toque** ≥ 44px nos chips do trilho no iPad (`@media (pointer:coarse)`),
   como manda DESIGN.md; no desktop, altura `--control-h`.

**Aceite.** No CC art. 1.239 (usucapião especial rural — "Aquele que, não sendo
proprietário de imóvel rural ou urbano, possua como sua, por cinco anos ininterruptos, sem
oposição, área de terra em zona rural não superior a cinqüenta hectares, tornando-a
produtiva por seu trabalho ou de sua família, tendo nela sua moradia, adquirir-lhe-á a
propriedade"): selecionar "Aquele que, não sendo proprietário de imóvel rural ou urbano" →
`1` pinta de azul e o trilho mostra "Quem?" preenchido; "por cinco anos ininterruptos" →
`5` (amarelo, Há prazo?); "tornando-a produtiva por seu trabalho ou de sua família, tendo
nela sua moradia" → `4` (Como?); marcar "não há" em Há proibição? mostra o chip riscado. A grade sobrevive a recarregar a página e aparece igual nas oito
direções e nos dois modos. Contraste de todo rótulo colorido ≥ 4,5:1 medido (script irmão
de `scripts/verificar-cores-ramo.mjs`, rodando no build e abortando em falha).

**Armadilhas.** `--danger` do tema também é vermelho: a proibição usa o **seu** token,
nunca `--danger`, e o chip sempre leva a palavra — daltonismo e neurodivergência não podem
depender da cor. Não usar `position:fixed` para o trilho (o iframe rola dentro do host).
Marcas de leitura e grifos livres coexistem no mesmo `.gr`: uma passada só, senão a segunda
apaga a primeira (`innerHTML`). Nada de emoji nos chips (DESIGN.md).

---

## LA3. Modo guiado — um dispositivo por vez, uma pergunta por vez

**Objetivo.** Para quem se perde na página inteira: o leitor mostra **só o dispositivo
atual**, faz **uma pergunta por vez** e avança quando ela responde. É a versão de tela do
método da Lana e o núcleo do posicionamento neuro-friendly (TDAH/autismo).

**O que já existe.**
- A gramática de composição do DESIGN.md — **bancada**: tarefa de agora no centro em
  escala grande, apoio à direita, fila embaixo (`.ct-bc`, `.ct-bc-foco`, `.ct-bc-apoio`,
  `.ct-bc-fila`). É exatamente a forma do modo guiado.
- `prefers-reduced-motion` já é respeitado no host (2 ocorrências); o modo foco
  (`enterFocus/exitFocus`) mostra o padrão de "esconder o resto".
- Atalhos: `_onKey` no host; no satélite, listeners próprios (ver `ritos-web` para o padrão
  de remover listener ao desmontar — o teste "MAPA remontar não acumula ouvintes" cobre
  isso).

**O que construir.**
1. Botão "Ler um por vez" no trilho/legenda → o leitor entra em `.la-guiado`: o documento
   some (não é removido — `visibility:hidden` para manter `disp[]` e âncoras), e a bancada
   ocupa a área: **foco** = o dispositivo atual em `--t-display`/`--t-titulo`, com o rótulo
   da norma (`sigla · rot`) em `--mono`; **apoio** = a pergunta atual em serifa
   (`--display`), o chip do elemento em foco, botões "Não há" e "Pular"; **fila** = os 7
   chips com a posição ("3 de 7") e, abaixo, "dispositivo 12 de 58" com barra de progresso
   (`translateX`, nunca `width`).
2. Fluxo: pergunta 1 (Quem?) em foco → a pessoa seleciona no texto do foco → a marca cai
   direto no elemento em foco (sem escolher cor: a cor é a da pergunta) → avança para a
   próxima pergunta. `0`/"Não há" grava `nao` e avança. Terminou 7 → aparece a
   **conferência** (LA4) ou, se desligada em Ajustes, "Próximo dispositivo" (`Enter`).
   `Esc` sai do modo guiado devolvendo o documento rolado no dispositivo atual.
3. Ordem de percurso: o documento na ordem do texto; opção "só dispositivos com
   incidência alta" (o leitor já classifica `alta/media/baixa` por artigo —
   `carregarIncidencia`, linha 271, `.art.alta` etc.) e "só o que ainda não li"
   (`CT_LA.progresso`).
4. **Baixa estimulação**: no modo guiado não há cronômetro, ofensiva, confete nem toast de
   celebração; transições só de `opacity` ≤ 150 ms e zero com `prefers-reduced-motion`.
   O único feedback é o chip preenchido e o contador. (Um interruptor global "baixa
   estimulação" fica para especificação própria; aqui o modo já nasce assim.)
5. Voz: leitura do dispositivo por `speechSynthesis` pt-BR (padrão do item 3 da
   especificação anterior: nativo, zero dependência). Botão discreto no apoio; nunca
   automático.

**Aceite.** Abrir a Lei 8.429/1992 no LEGIS, "Ler um por vez": só o art. 1º aparece, com
"Quem?" em foco; responder 7 perguntas (ou "não há") leva ao art. 2º; `Esc` volta ao
documento no art. 2º. Com `prefers-reduced-motion`, nenhuma animação. Teclado completo:
`1`–`7`, `0`, `Enter`, `Esc`, sem precisar do mouse depois de selecionar.

**Armadilhas.** Seleção por teclado em WKWebView é limitada — oferecer também **toque por
palavra**: no modo guiado, o texto do foco é renderizado em `<span class="la-pal">` por
palavra; toque estende a seleção palavra a palavra (dois toques = intervalo). Sem isso, o
iPad fica de fora. Não usar `alert/confirm` (bloqueia o iframe). `visibility:hidden` no
documento, não `display:none`: senão `scrollIntoView` do retorno perde a âncora.

---

## LA4. Conferência imediata e "erro como filtro"

**Objetivo.** Terminou a grade de um dispositivo → o app esconde o que ela marcou e pergunta
de volta; **só o que ela errou ou hesitou vira cartão e revisão**. Acertou: nada é criado.
É a regra dela ("cards Anki só dos erros e hesitações") virando comportamento.

**O que já existe.**
- Revisão espaçada FSRS-6 no host: `fsrs(estado, q)`, fila `catedra:reviews`
  (itens `{id, topic, disc, intervalo, repeticoes, due, dueDate, up, fsrs}`;
  `facilidade` antiga preservada para compatibilidade),
  sessão "Revisar agora" (`startRevSession`, `revReveal`, `revAnswer` com `q` 1/3/4/5).
- Caderno de erros `catedra:errors` e flashcards `catedra:fc` criados pelo canal
  `ctFlashcards` (`{id:'fc'+ts, front, back, disc, origem, criado, ia}`, `_saveFC`,
  `flashSync`) — **padrão a copiar** (é o mesmo que o item 2 da especificação anterior
  manda copiar).
- Toast da casa `this._toast(...)`.

**O que construir.**
1. No LEGIS, ao completar a grade (ou por botão "Conferir" no trilho): painel
   `.la-conferencia` na bancada: o dispositivo com **uma** marca escondida por vez
   (lacuna `▁▁▁▁` na cor do elemento, rótulo visível: "Há prazo?"), botão "Mostrar";
   depois de mostrar, três botões — **Errei** (q=1), **Hesitei** (q=3), **Acertei** (q=5).
   Uma rodada percorre os elementos marcados (não os "não há") em ordem fixa.
2. `CT_LA.conferir(item, el, q)` grava `conf` e devolve `criar`:
   - q=5 → `criar:{}` (nada; só o registro `conf`);
   - q=3 → `criar:{fc, review}`;
   - q=1 → `criar:{fc, review, erro}`.
   O LEGIS posta `ctLeituraConferida` com o payload pronto (o iframe não escreve nas
   chaves do host).
3. Host (`_acervoMsg`): cria o flashcard (LA5) em `catedra:fc`; cria/atualiza em
   `catedra:reviews` o tópico `sigla + ' ' + rot + ' — ' + rotulo` (id determinístico
   `'rv|la|'+leituraId+'|'+el`; se já existe, aplica `sm2(r, q)` em vez de duplicar);
   q=1 cria também item em `catedra:errors` `{id, up, disc, topic, fonte:'leitura-ativa',
   ref:sigla+' · '+rot, el}` com dedupe por `id` nos últimos 30 dias. Toast: "1 cartão e
   1 revisão do art. 5º, XI" com **desfazer** que remove os ids do lote (padrão do item 2).
4. `disc` do cartão/revisão = disciplina da lei pelo catálogo (`CT_LEIS_CAT.c` →
   nome de disciplina do edital via o mapa que o simulado já usa em `ramo`); se não
   houver, a `sigla`.

**Aceite.** Grade completa com 4 marcas → conferência de 4 lacunas; 2 "Acertei", 1
"Hesitei", 1 "Errei" geram exatamente 2 flashcards, 2 revisões (a de "Errei" com
`intervalo` 1) e 1 erro; "desfazer" remove os 5 registros. Repetir a conferência do mesmo
dispositivo **não** duplica revisão (id determinístico); flashcards repetidos são barrados
por `hash(front)` nos últimos 30 dias. Sem conferência, nada é criado — ler não gera
cartão.

**Armadilhas.** Lote: máximo 7 cartões por dispositivo por definição (um por elemento),
mas um artigo com 20 incisos lidos em sequência pode gerar dezenas — respeitar o teto por
mensagem (20, como `ctFlashcards`) e enfileirar o resto com aviso. Itens novos precisam de
`id` e `up`. Não usar `window.confirm` para o "desfazer" (toast com ação, como o item 2).

---

## LA5. Cloze de lei seca — formato dos cartões

**Objetivo.** O cartão criado pela conferência é o cartão Cloze que a Lana já faz à mão no
Anki: fidelidade literal ao texto, um dispositivo por cartão, no máximo 3 lacunas, com
"Back Extra" de fundamento e explicação curta.

**O que já existe.**
- Regras dela para o deck Cloze (memória de trabalho, confirmadas): recall literal; ocultar
  só termos-chave; **máx. 3 grupos de cloze por card**; caput e cada inciso/parágrafo/
  alínea em cards separados; Back Extra com fundamento legal, explicação didática e alerta
  de prova só se houver pegadinha real; sinalizar dispositivo revogado/vetado.
- `CT_TREINO.proposicoesDoArtigo` já produz a unidade "caput + inciso" com rótulo
  ("Art. 5º, XI") e limita a 520 caracteres; `inverter(txt)` conhece os termos que a banca
  troca (é o que a pegadinha do simulado usa).
- Exportação Anki: `exportFlashcardsCSV` (Catedra.dc.html ~linha 5535, "Flashcards em
  .txt que o Anki importa direto"), histórico `catedra:ankiHist`/`ankiImported`.

**O que construir.**
1. `CT_LA.cloze(item, el, txt)`:
   - texto-base = a proposição do dispositivo (se o `gi` é um inciso, junta o tronco do
     caput como `proposicoesDoArtigo` faz; se é caput com `:` no fim, usa só o caput);
   - lacunas = as marcas de `el` (até 3; excedentes ficam visíveis), na sintaxe do Anki:
     `{{c1::trecho}}`, `{{c2::…}}`, `{{c3::…}}` — **uma pergunta por cartão**, então um
     cartão por elemento conferido;
   - `front` = texto com as lacunas (sintaxe Anki), `back` = texto integral com o trecho
     em destaque, `extra` = `sigla · rot` + rótulo da pergunta ("Há prazo?") + explicação
     curta em uma frase gerada por regra (ex.: "Prazo de cinco anos, contado de forma
     ininterrupta") + alerta só se `inverter` identificar termo trocável no trecho
     ("A banca costuma trocar *cinco* por *dez*");
   - devolve `{front, back, extra, tags:['leitura-ativa', sigla, el]}`.
2. Cartão em `catedra:fc`: `{id:'fc'+ts, front, back, extra, disc, origem:'leitura-ativa',
   ref:sigla+' · '+rot, el, leituraId, tipo:'cloze', criado, up}` — `tipo:'cloze'` é o que
   diz à exportação para usar o modelo Cloze.
3. `CT_LA.renderCloze(front, {revelar:false})` → HTML para o app: `{{cN::x}}` vira
   `<span class="la-lacuna la-<el>">` com largura proporcional ao trecho (`ch`) e, ao
   revelar, o trecho com fundo da identidade. Usado na conferência (LA4) e na sessão
   "Revisar agora" quando o tópico é de leitura ativa (o `revReveal` mostra o cartão
   renderizado em vez de texto solto).
4. `exportFlashcardsCSV`: cartões `tipo:'cloze'` saem em arquivo próprio
   (`catedra-cloze-lei-seca.txt`, TSV `front[TAB]extra`, com nota no rodapé da tela: "no
   Anki, importe com o tipo de nota Cloze e permita HTML"). Os demais continuam no arquivo
   atual.
5. Dispositivo com nota de revogação/veto (`splitNota`, legis-web.html linha 657, devolve
   `notas`) → o
   cartão nasce com prefixo "(REVOGADO)"/"(VETADO)" no `extra` e o chip da grade avisa
   antes de conferir.

**Aceite.** Conferência de "Há prazo?" no CC art. 1.239 gera
`front = "Aquele que, não sendo proprietário de imóvel rural ou urbano, possua como sua,
por {{c1::cinco anos}} ininterruptos, sem oposição, área de terra em zona rural não
superior a cinqüenta hectares, …"`, `extra = "CC · Art. 1.239 · Há prazo? — Prazo de
cinco anos, contado de forma ininterrupta e sem oposição"`. Importar o TSV no Anki
como Cloze cria a nota sem erro. Nenhum cartão passa de 3 lacunas; um cartão nunca mistura
dois elementos.

**Armadilhas.** Textos com `{{` ou `}}` literais (raros) precisam de escape. `front` no
host é cortado em 600 caracteres pelo canal `ctFlashcards` — para cloze usar canal próprio
(`ctLeituraConferida`) com limite 900 e nunca cortar no meio de `{{…}}`. Explicação "por
regra" é curta e literal — **IA não entra aqui**; a variante com IA (LA-IA, abaixo) é
opcional e desligada.

---

## LA6. Onde mais a grade aparece

**Objetivo.** A leitura feita no LEGIS reaparece nos lugares onde o mesmo dispositivo volta
— prova oral, simulado e caderno — e conta como estudo.

**O que já existe.**
- Prova oral → aba Lei seca (`oralModo==='lei'`, template ~linha 3027): sorteia artigo de
  `CT_LEIS` (`sortearArtigoOral`) e mostra `oralArtRot`/`oralArtTexto`.
- Simulado misto: itens `origem:'lei'` trazem `ref` (`sigla · rot`) e `contexto` (texto
  da proposição) — `simuladoLeisEmbutidas` em `treino.js`.
- Registro de sessão: categoria `'Lei seca'` em `CT_ATIVIDADES` (~linha 5899) e
  `catedraOpenStudyRegistration` pré-preenchido (usado pelo painel de prioridade).
- Painel "onde estou fraca" (`prioridade-calc.js`) consome `errors`, `reviews`,
  `sessions`, `incidencia`.

**O que construir.**
1. **Oral · Lei seca**: quando existe leitura para `sigla+rot` (casar `CT_LEIS.url` ↔
   `leiId` e `rot` ↔ `rot`), mostrar o trilho **só leitura** sob o dispositivo e o botão
   "Ler ativamente no LEGIS" (canal `ctAbrirAcervo` com `termo` = rot; o LEGIS abre a lei
   e rola até o dispositivo — o caminho de busca já existe, PR #5).
2. **Simulado**: no gabarito comentado de item `origem:'lei'` errado, mostrar a grade
   quando houver e o botão "Conferir de novo" (abre LA4 direto naquele dispositivo);
   sem leitura, "Ler ativamente" — é assim que o erro do simulado puxa a leitura da lei.
3. **Sessão**: ao sair do modo guiado com ≥ 1 dispositivo lido, oferecer "Registrar
   sessão" pré-preenchida (`categoria:'Lei seca'`, `disc` da lei, minutos medidos no
   modo guiado, tópico = `sigla` + faixa de artigos); o interruptor "Parei o cronômetro →
   oferece registrar" já existe em Ajustes e dita o comportamento.
4. **Progresso por lei** no catálogo do LEGIS (`.dipBar` já existe): segunda barra fina
   "lido ativamente 32%", e no painel de prioridade um fator novo, de peso pequeno (5%,
   dentro da constante única de pesos): dispositivos de incidência alta ainda não lidos.

**Aceite.** Sortear no oral um artigo já lido mostra a grade; errar um item de lei no
simulado oferece "Conferir de novo" que abre a conferência do dispositivo certo; a barra do
catálogo sobe conforme se lê. Nada disso exige rede.

**Armadilhas.** Casar `rot`: o leitor grava "Art. 5º, XI"; `CT_LEIS` tem `rot` "Art. 5º"
por artigo e `proposicoesDoArtigo` produz "Art. 5º, XI" — normalizar (`º/o`, espaços,
travessões) antes de comparar. Não carregar `leis-seca.js` (4,4 MB) no LEGIS por causa
disto: o LEGIS só precisa do `leiId`; o host é quem tem `CT_LEIS`.

---

## Acessibilidade e cor (vale para LA2–LA6)

- **Nunca cor sozinha**: rótulo escrito em todo chip e lacuna; `title`/`aria-label`
  com a pergunta; ordem fixa dos 7 como segunda pista; sublinhado nas marcas.
- **Texto ≥ 4,5:1** com `--la-*-tx`; identidade (fundo/borda) ≥ 3:1 contra a superfície.
  Estender `scripts/verificar-cores-ramo.mjs` para medir os 14 tokens em claro/escuro nas
  oito direções — falha de contraste é falha de build.
- **Toque** ≥ 44px em chips e botões da bancada no iPad; **teclado** completo; foco
  visível (anel `0 0 0 3px`, permitido pelo DESIGN.md).
- `prefers-reduced-motion`: zero animação; sem `position:fixed`; sem `alert/confirm`.
- Tamanho de fonte por token (`--t-*` no satélite, `--fs-*` no host) — nada em px.

## Testes (tests/run.mjs + harness novo)

1. `tests/harness-leitura-ativa.html` carrega `leitura-ativa.js` e um dispositivo fixo
   (CC art. 1.240). Casos, no padrão `ok(cond,label)` com prefixo `LEITURA`:
   - `marcar/naoHa/completude`: 4 marcas + 3 "não há" → `respondidas` 7;
   - `cloze`: 1 lacuna por elemento, sintaxe `{{c1::…}}`, nunca > 3, `front` ≤ 900,
     `extra` com `sigla · rot` e rótulo; texto com `{{` literal escapado;
   - `conferir`: q=5 não cria nada; q=3 cria fc+review; q=1 cria fc+review+erro;
   - `hash`: mudar uma letra do texto marca `desatualizada`.
2. Canal: no host aberto logado (padrão `catedra:auth`/`onboarded`), abrir a view `legis`,
   postar de dentro do iframe `ctLeituraAtiva` e `ctLeituraConferida` e verificar
   `catedra:leituras`, `catedra:fc` (com `tipo:'cloze'`), `catedra:reviews` (id
   `rv|la|…`) e `catedra:errors` no `localStorage`; "desfazer" limpa o lote.
3. Sync: `tests/sync-fixture.html` ganha um caso para `catedra:leituras` (união por id,
   `up` maior vence, lápide apaga).
4. Tokens: o teste D1/TASK9 já verifica que tokens chegam ao iframe — acrescentar
   `--la-quem` e `--la-proibicao-tx` à lista conferida.
5. WebKit: o roteiro `tests/run-webkit.mjs` ganha "abrir o LEGIS, ligar leitura ativa,
   marcar por toque de palavra" quando LA3 estiver pronto.

## Ordem sugerida

`LA1 → LA2 → LA4 → LA5 → LA3 → LA6`. LA1 dá o modelo e o canal; LA2 já entrega valor (a
grade visível); LA4+LA5 fecham o ciclo "erro vira cartão"; LA3 é o modo guiado, que só faz
sentido com conferência pronta; LA6 espalha. Um PR por item, cada um com seus casos.
Estimativa honesta: LA1 1 dia; LA2 2 dias; LA4+LA5 2 dias; LA3 2–3 dias; LA6 1–2 dias.

## Fora de escopo (decidido, com razão)

- **IA preenchendo a grade** (LA-IA): possível via `/api/complete` ("sugira Quem/O quê/…
  deste dispositivo"), mas **desligada por padrão** e nunca gravando sozinha — a
  aprendizagem está em a pessoa marcar. Se entrar, é como "sugestão" que ela confirma
  chip a chip, com o consentimento de IA da política de privacidade.
- **Paridade nativa (Swift LEGIS)**: o leitor nativo tem marcação com cor livre e SRS
  próprios; a grade deve chegar lá com os mesmos 7 tokens e o mesmo JSON de
  `catedra:leituras` (o sync já leva). Especificação própria, no padrão do
  `handoff-area-estudo.md`.
- **Interruptor global "baixa estimulação"** (esconder ofensiva, confete, ranking): item
  de produto separado; o modo guiado já nasce sem estímulos.
- **Cloze em jurisprudência**: o mesmo motor serve a verbetes do JURIS (sujeito/tese/
  exceção), mas a grade de 7 perguntas foi desenhada para dispositivo de lei; adaptar
  depois, com grade própria.

## Riscos

- **Offsets e redação nova**: mitigado por `t` + `hash` + estado "desatualizada".
- **Volume de cartões**: mitigado pelo filtro (só erro/hesitação) e pelo teto por lote.
- **Cross-origin em file://**: espelho local no LEGIS + host como fonte da verdade;
  testar no `run-webkit.mjs` em `file://`.
- **Vermelho da proibição × `--danger`**: token próprio + rótulo sempre escrito.
