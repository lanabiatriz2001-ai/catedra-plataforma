# Sentinela das fontes oficiais

O sentinela vigia as fontes oficiais do LEGIS e do JURIS e avisa o que mudou. Este texto
descreve o estado em 01/10/2026, depois da fusão do trabalho do Claude (15/09/2026) com o do
Codex (30/09/2026) sobre a `main`.

Atualização assistida: o sentinela detecta e propõe; item marcado para revisão só entra no acervo depois de conferido na fonte oficial.

Nada entra no acervo sozinho:

- o LEGIS só recebe aviso. Nenhuma automação regrava `leis-seca.js`;
- informativo novo entra no JURIS por PR de rascunho, revisado. Quem prepara esse PR é o
  workflow do sentinela, quando ligado (ver "Quem faz o quê");
- toda automação prepara; nenhuma mescla.

O app nunca consulta o Planalto, o STF ou o STJ. A tela lê o `novidades.js` embutido. O botão
"Buscar atualizações agora" chama `/api/sentinela`, que roda na Vercel.

## Situação em 01/10/2026

- **O JURIS ficou parado de 11/09 a 01/10/2026.** Depois do PR #71 (11/09/2026), o acervo
  parou no STF 1224, no STJ 900 e na extraordinária 33 do STJ. O PR #176 (branch
  `informativos-outubro`) incorporou à mão, no Mac, os 68 julgados do STF 1225 a 1230 e do STJ
  901 a 903, e foi mesclado na `main` em 01/10/2026. Nenhuma extraordinária nova tinha saído: a
  34 respondia com a página genérica.
- **A rotina semanal na nuvem falha toda segunda desde 07/09/2026.** A rede dela não alcança os
  tribunais (ver "Rotina semanal na nuvem").
- **O workflow do sentinela volta a incorporar informativos.** Está desligado por padrão e nunca
  executou. O único registro dele no Actions, de 01/10/2026, é a recusa do arquivo por erro de
  YAML no commit ff8ea39 do PR #175, corrigido no mesmo PR.
- **A lei seca do CTN e do CPC pode estar defasada.** A varredura de 15/09/2026, que não foi
  publicada, apontou mudanças da Lei Complementar nº 236/2026 no CTN e da Lei nº 15.484/2026 no
  CPC. O `leis-seca.js` não tem nenhuma das duas (ver "Primeira publicação").
- **Nenhuma varredura foi publicada.** O Início e a Central mostram as três fontes como "Nunca
  consultada".
- **A CI voltou em 01/10/2026**, depois de parada por cobrança desde 16/09/2026 (UTC; noite de
  15/09 no horário de Brasília).

## As peças

| Peça | Arquivo | O que faz |
| --- | --- | --- |
| Motor | `scripts/sentinela.mjs`, `scripts/lib/tls-fontes.mjs` | Lê as fontes, compara com o bundle, escreve `novidades.js` e `sentinela/estado.json`. |
| Leitor do Planalto | `scripts/lib/planalto.mjs` | Parser único do texto compilado. `scripts/build-leis-seca.mjs` importa o mesmo. |
| Pacote | `novidades.js` | `window.CT_NOVIDADES`, embutido na web e nos apps. |
| Diário | `sentinela/estado.json` | Por fonte: última tentativa, último sucesso e resultado. Não vai para o app. |
| Workflow | `.github/workflows/sentinela.yml` | Detecta, incorpora os informativos novos e prepara um PR de rascunho. Desligado por padrão. |
| Incorporação | `scripts/atualizar-informativos.py` | Anexa as edições novas a `juris-index.js` e `juris-text.js` e regenera `semana-juris.js` e as fatias. |
| Rotina na nuvem | rotina do Claude `trig_01SpBvS1YZNyCqS8DHWeQpZc` | Roda o mesmo script toda segunda. Falha desde 07/09/2026. |
| Consulta sob demanda | `api/sentinela.js` | O botão "Buscar atualizações agora". Consulta e responde; não grava. |
| Tela | `Catedra.dc.html` | Bloco "Fontes oficiais" no Início e Central de novidades em "Mais opções". |
| Service worker | `sw.js` | Não guarda nem devolve `/api/sentinela`. |
| Régua do motor | `tests/sentinela.mjs`, `tests/fixtures/informativos/manifesto.json` | 138 casos, sem rede, ligados à suíte Chromium. |
| Régua da tela | `tests/novidades-central.mjs` | Início e Central, nas suítes Chromium e WebKit. |

## O que cada fonte cobre

### Planalto — texto compilado

Monitora as 14 normas de `leis-seca.js`: CF, CC, CPC, CP, CPP, CDC, CTN, CLT, LIA (Lei de
Improbidade Administrativa), Lei 14.133/2021 (Licitações e Contratos), ECA, LEP, Lei Maria da
Penha e Lei de Drogas. A lista vai no estado do Planalto (`normas: [{sigla, nome}]`), e a tela
a mostra.

A comparação é ARTIGO a artigo (desde 02/10/2026). O acervo guarda o texto em trechos, e às
vezes um trecho junta mais de um artigo: o parser (o mesmo do LEGIS, que o sentinela não muda)
extrai 118 cabeçalhos dos 221 artigos do CTN; os outros ficam embutidos no trecho do vizinho,
muitas vezes depois de um título ("CAPÍTULO IV Interpretação… Art. 107."). Antes de comparar,
os dois lados — acervo e página — passam pela mesma divisão: a remissão de rótulo minúsculo
("art. 142 desta Lei" começando linha) volta ao texto do artigo de onde saiu; cada trecho é
dividido nos artigos embutidos, no cabeçalho "Art. N" maiúsculo de outro número (o mesmo número
é outra redação do mesmo artigo); o título de divisão que fecha um artigo sai da comparação. A
página é lida também sem o teto de 4.000 caracteres do bundle (`semTeto`, com os mesmos cortes),
então o artigo que o acervo guarda inteiro é comparado inteiro.

Conferido contra a página oficial do CTN de 01/10/2026 (LC 236/2026): a anotação da LC 236 vai
para o artigo que a recebeu (107, 194, 196, 201, 202, 205), e não para o dono do trecho (106,
193, 200, 204, 208), como antes; a alteração real do art. 146 vira item (antes ficava depois do
teto do trecho do 142); o art. 211-A sai inteiro e com a LC 236 (antes, cortado em "… § 5º do" e
sem modificadora); nenhum item de recorte sobra no CTN. Nas outras 13 normas, as páginas de
01/10/2026 dão exatamente os mesmos itens que a comparação antiga.

Artigo que o acervo não pôde guardar — depois do teto de um trecho cortado, ou depois de um
"buraco" (remissão no teto no meio do trecho) — não tem "antes": não vira inclusão. Só vira item
(`parcial`, sem "antes", para conferir) quando traz anotação de norma que o acervo da lei não cita
em lugar nenhum.

Não cobre:

- as outras 254 normas do catálogo do CátedraLEGIS (`leis-catalogo.js`, 268 no total). Entre
  elas estão as 35 leis secas das outras áreas de estudo (`leis-seca-areas.js`);
- norma nova: o índice de legislação do Planalto fica atrás de escudo anti-robô (F5/TSPD).
  Norma nova entra pelo catálogo do CátedraLEGIS;
- a data de publicação da norma modificadora: o item traz só o nome dela, como a página anota;
- revogação sem anotação: só conta como revogação o "(Revogado pela…)" no caput do artigo.

### STF e STJ — coleções (Fase 2, 02/10/2026)

A tela continua com TRÊS fontes. O STF e o STJ ganharam COLEÇÕES (`COLECOES` em
`scripts/sentinela.mjs`; `colecao` em cada item; `colecoes: {id: {resultado, ultimaTentativa,
ultimoSucesso, ultimaLeituraCompleta, erro, detalhe}}` no estado de cada fonte). O resultado da
fonte é o PIOR das coleções que rodaram: falha > parcial > novidades > sem-novidade. Falha de uma
coleção não apaga o que as outras leram, e nunca vira "sem novidade".

| Fonte | Coleção | Rota oficial | Compara com |
|---|---|---|---|
| STF | `informativo` | `www.stf.jus.br/arquivo/informativo/documento/informativoN.htm` | a última edição do acervo |
| STF | `rg` | `portal.stf.jus.br/jurisprudenciaRepercussao/exportarDados.asp?…` (todos os temas, 1 pedido, ~4 MB, 9–10 s); `tema.asp` e `verAndamentoProcesso.asp` para as datas (só na rotina) | a última leitura oficial registrada (`sentinela/retratos.json`, chave `stf.rg`) |
| STF | `sumulas` | `portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=26` (63 vinculantes) e `base=30` (736 comuns); detalhe só da súmula nova | o acervo (`juris-index.js`) |
| STJ | `informativo` | `processo.stj.jus.br/jurisprudencia/externo/informativo/…` | a última edição de cada série |
| STJ | `repetitivos` | `processo.stj.jus.br/repetitivos/temas_repetitivos/pesquisa.jsp` em faixas de 50 temas | `sentinela/retratos.json`, chave `stj.repetitivos` |
| STJ | `sumulas` | o PDF "Enunciados das Súmulas do STJ" (`www.stj.jus.br/…/VerbetesSTJ_asc.pdf`, lido com o PDF.js de `vendor/pdfjs`) e o bloco "Súmulas" das edições NOVAS do Informativo (sem pedido extra) | o acervo |

Tipos novos de item, todos `revisar: true` ao nascer — nenhum reclassifica precedente sozinho:
`tema-afetado`, `julgamento`, `tese-fixada` (antes/depois = a tese), `acordao-publicado`,
`situacao`, `sumula-nova`, `sumula-cancelada`, `sumula-revisada` e `modulacao` (só nos
repetitivos, quando o STJ registra "Modulação de efeitos" nas anotações; na RG a lista oficial não
tem o campo, e isso é limite declarado). Cada item traz `colecao`, `numero`, `titulo` ("Tema 1234 —
STF", "Súmula 677 — STJ", "Súmula Vinculante 63 — STF"), `antes`/`depois`, `situacao`, as datas
oficiais quando a fonte as dá (`afetadoEm`, `julgadoEm`, `publicadoEm`, `transitadoEm`,
`aprovadaEm`, `canceladaEm`), `urlOficial` (https em stf.jus.br ou stj.jus.br), `acompanhado` e
`termoJuris` (o título exato do verbete no JURIS, para "Abrir no JURIS"). O id é determinístico:
fonte + coleção + número + tipo + sha do estado NOVO. A pendência de julgamento e tese repete a
regra da dona: "Decisão mais recente não significa, sozinha, superação do entendimento anterior."

Por que a RG e os repetitivos comparam com a LINHA DE BASE e não com o acervo: medido em
01/10/2026, com o acervo como base o STF daria 33 "temas novos" falsos (1452 a 1485) e calaria as
mudanças reais da semana; o STJ daria 53 "tema afetado" falsos (1422 a 1474). 667 temas oficiais
de RG estão fora do CátedraJURIS — lacuna do acervo, tratada na auditoria. A linha de base anda
SÓ nas chaves que a rodada leu com sucesso, e vai no PR do robô junto com o `novidades.js`. O
acervo decide `acompanhado` e a BAIXA ("No acervo · já no JURIS"): quando o acervo já mostra o
estado apontado (tese contida no texto do verbete, mesma situação, súmula presente ou cancelada);
"não dá para afirmar" não muda nada; comparação parcial nunca recebe baixa.

Orçamento. A rotina diária (workflow, até 60 min) faz a varredura completa: o export da RG e os
andamentos dos temas que mudaram; os repetitivos faixa por faixa (31 pedidos, 5 a 7 min); o PDF de
súmulas do STJ inteiro. O botão "Buscar atualizações agora" (45 s) faz só a parte rápida: o export
da RG inteiro (1 pedido); nos repetitivos, só a cauda (temas acima do último conhecido), e a
coleção sai `parcial` com o detalhe "varredura completa só na rotina diária"; no PDF do STJ, só um
GET condicional (304 = nada mudou; 200 = parcial, "a lista mudou"). As coleções de uma fonte rodam
em paralelo, cada uma com a sua sessão de pedidos.

Etiqueta com os tribunais: pausa de ≥ 3 s entre pedidos da mesma coleção, no máximo 2 conexões
por host, teto por pedido, e na rotina até 3 tentativas (8 s e 16 s de espera) para erro de rede,
5xx ou formato não reconhecido. User-Agent de navegador (o export da RG responde 403 sem ele).
Hosts liberados em `scripts/lib/tls-fontes.mjs`: `www.stf.jus.br`, `portal.stf.jus.br`,
`processo.stj.jus.br`, `www.stj.jus.br`. Ficam FORA, de propósito: `scon.stj.jus.br` e
`jurisprudencia.stf.jus.br` (desafio anti-robô, que não se contorna), `bdjur.stj.jus.br` (sem um
registro por súmula).

Travas: âncora (o último item conhecido tem de ser reconhecido pela mesma régua: senão, falha "a
página mudou de formato"); mínimo de 1.400 linhas no export da RG; até 5 temas sumidos por faixa
nos repetitivos; volume atípico (mais de 50 itens numa rodada) vira falha, para conferir a linha
de base.

Os limites de cada coleção estão em `COLECOES` e aparecem na tela, por extenso, com o rótulo da
coleção na frente.

### Os limites na tela

A tela mostra como limite a lista `COBERTURA`, em `scripts/sentinela.mjs`. Ela vai gravada no
estado de cada fonte (`limites`). Dois limites deste documento não estão nela e não aparecem na
tela: a data de publicação da norma modificadora (Planalto) e a Jurisprudência em Teses (STJ).

## O que o motor garante

Resultado por fonte:

- `sem-novidade`: a fonte respondeu e nada mudou.
- `novidades`: a fonte respondeu e trouxe item novo.
- `parcial`: a fonte respondeu, mas alguma norma ou edição não teve leitura conclusiva. O erro
  diz qual e por quê. Nada é registrado para ela.
- `falha`: a fonte não pôde ser consultada. Falha nunca vira "nenhuma novidade", em nenhuma das
  três fontes.

Datas por fonte:

- `ultimaTentativa` anda em toda consulta.
- `ultimoSucesso` só anda quando o resultado não é `falha`. Fonte que falhou guarda o último
  sucesso anterior. `parcial` conta como sucesso para a data, mas a tela trata como lacuna.

### No Planalto

- Toda diferença é confirmada por uma segunda leitura. Se as duas divergirem, nada é registrado
  e a norma não conta como lida. Com todas as normas divergentes, a fonte é `falha`.
- Leitura com menos de 80% dos artigos esperados da norma é "parse suspeito": a norma falha.
- Artigo do acervo que some da página não vira revogação. O Planalto mantém o artigo revogado
  no texto compilado, com a anotação. Artigo sumido é leitura suspeita da norma inteira: a
  norma falha e nada é registrado para ela.
- Revogação é o caput que ganha um "(Revogado pela…)" novo. O item sai como `revogacao`, com o
  antes, o depois e a norma revogadora. Revogação só de parágrafo ou inciso continua alteração.
  Artigo revogado há tempo, cujo texto oscila, não vira revogação nova.
- Rótulo de margem ("Regulamento", "Vigência"), remissão em minúscula lida como artigo e artigo
  cortado no teto de tamanho não viram alteração. No teto, a comparação usa só o começo comum
  e o item sai marcado como `parcial`.
- Quando o texto do próprio artigo não mudou e a diferença é só de recorte, o item sai com
  `recorte: true`, sem norma modificadora e pendente de conferência.
- O texto próprio do artigo vai até o cabeçalho de OUTRO artigo. O cabeçalho repetido do mesmo
  número não corta: o Planalto mantém a redação antiga e a nova sob o mesmo "Art. N", e a mudança
  na redação em vigor é do próprio artigo. Medido em 01/10/2026 no `leis-seca.js`: são 6 artigos
  da CF (76, 101, 107, 111-A, 115 e 169). Cortando no primeiro cabeçalho, uma mudança real na
  redação em vigor deles sairia como recorte falso, sem autoria.
- A norma modificadora é a anotação que entrou no texto do próprio artigo. Sem anotação nova, ela
  fica vazia e o item vai para conferência. O motor não empresta a anotação antiga do artigo nem
  a de um artigo vizinho.
- O nome da norma modificadora termina no ")" da anotação. Quando o Planalto não fecha o
  parêntese, termina no "(" ou no "§" seguinte. E termina sempre na data da norma: o resto do
  artigo não entra no nome. Anotação sem fecho e sem data (artigo cortado no meio dela) não
  conta. Medido em 01/10/2026 no `leis-seca.js`: nenhum nome de norma modificadora traz "§" ou "("
  nem passa de 70 caracteres.
- Acervo sem nenhuma edição extraordinária do STJ: a última é desconhecida e a série falha (antes,
  o motor supunha a EE27 e reanunciaria da EE28 em diante).
- Erro de rede chega por extenso, em português, com o host e a causa técnica entre parênteses
  ("o endereço da fonte não foi encontrado (DNS) — www.stf.jus.br (ENOTFOUND)").
- `parcial` move o último sucesso (é leitura útil, com a lacuna nomeada no erro); a última leitura
  SEM lacuna fica em `ultimaLeituraCompleta`, na fonte e em cada coleção.
- Vigência: `em-vigor`, `aguardando` ou `indeterminada`. A data só vale colada ao marcador:
  "(Vigência) a partir de 01/01/2027". Data solta no artigo quase sempre é a da lei
  modificadora e não decide nada. Um marcador sem data deixa o artigo `indeterminada`. Medido em
  01/10/2026 no `leis-seca.js`: nenhum dos 541 marcadores "(Vigência)" traz data colada.
- Produção de efeitos é registrada à parte da vigência (`efeitos`, `efeitosEm`). Quando a página
  marca "(Produção de efeito)" sem data, o item avisa que a norma produz efeitos em data própria
  e vai para conferência.

### Nos informativos

- A edição é reconhecida pelo número pedido no título da página (`<title>`, lido em latin1):
  "Informativo de Jurisprudência n. N" no STJ, "Edição Extraordinária n. N" na extraordinária e
  "Nº N" no STF. Marcadores do corpo da página e tamanho não contam.
- Âncora: antes das edições novas, o motor consulta a última edição do acervo (no STJ, também a
  última extraordinária). Se a régua não a reconhecer, a fonte é `falha`: "a régua não reconheceu
  a edição N, que já está no acervo: a página mudou de formato". Âncora com resposta diferente de
  200 também é `falha`.
- STJ: a página genérica (200, título sem número) é edição que não saiu. Resposta diferente de
  200, ou página sem o título do Informativo, é falha daquela edição.
- STF: só o 404 é edição que não saiu. 200 sem o número no título, 403 e 500 são falha daquela
  edição.
- Ordinárias e extraordinárias correm em séries separadas. Duas ordinárias seguidas que não
  saíram encerram as ordinárias, que vão no máximo a 12 edições além da última do acervo
  (`--max-edicoes`). As três extraordinárias seguintes são sempre consultadas. Três falhas
  seguidas interrompem a série, e a fonte fica `parcial`.
- Se nenhuma edição nova teve resposta conclusiva, a fonte é `falha`, não "sem novidade".
- Títulos reais baixados em 01/10/2026: STJ 900 a 904 e 7777, extraordinárias 29, 33 e 34;
  STF 1224, 1225, 1230 e o 404 da 1231. As demais edições são simuladas no mesmo formato. Com
  isso, a régua dá STJ 901, 902 e 903 novas, nenhuma extraordinária nova (a 34 não saiu), e
  STF 1225 a 1230.
- Edição nova nasce pendente de revisão. Decisão mais recente não significa superação da
  anterior.

### Baixa: o que já entrou no acervo

- Informativo cuja edição está em `juris-index.js` recebe baixa: `incorporado: true`,
  `incorporadoTxt: 'já no JURIS'`, `revisar: false`, sem pendência.
- Vale a PRESENÇA da edição no acervo, não o número da última. O script
  `scripts/atualizar-informativos.py` segue adiante depois de uma edição que não respondeu, e o
  acervo pode sair com a 901 e a 903 sem a 902. Nesse caso, a 902 fica "Conferir": lacuna na
  série nunca ganha "já no JURIS".
- Mudança de lei recebe a mesma baixa (`incorporadoTxt: 'já no LEGIS'`) só com quatro
  condições: a norma teve leitura conclusiva nesta rodada; a rodada não voltou a achar o item; o
  artigo do `leis-seca.js` de agora tem o texto novo do item; e essa comparação foi completa. Se
  o artigo do acervo regerado bate no teto, só o começo seria comparado, e o item fica para
  conferir.
- Diferença que sumiu sozinha não prova incorporação. Página que voltou atrás, ou mudança
  substituída por outra, não recebe baixa. Leitura divergente, artigo sumido ou falha também não.
- Item `parcial` nunca recebe baixa: com o artigo no teto, começo igual não prova que o acervo
  tem o artigo inteiro.
- Se o acervo da rodada não tem uma edição que o `novidades.js` dava como "já no JURIS", a baixa
  é desfeita e o item volta a pendente.
- Na tela, item com baixa aparece "No acervo", com o selo de `incorporadoTxt` (ver "Vocabulário
  único").

### Em tudo

- O id do item é determinístico. No Planalto, sai do texto comparável (sem rótulo de margem,
  espaços normalizados); no artigo no teto, só do começo. A mesma mudança com "Regulamento" novo
  na margem mantém o id. O workflow e o botão convergem para o mesmo registro, sem duplicata.
- Item já conhecido preserva a data de detecção e a marca de lido. `revisar` e a pendência vêm
  da regra atual, para uma regra nova valer também para item antigo.
- A rodada conta os itens novos (`novos`) e os itens conhecidos cuja revisão mudou (`baixas`).
- `--ja-propostos <arquivo>`: os ids do `novidades.js` de um PR fechado sem merge continuam no
  resultado, mas não contam como novos.
- Com prazo (o botão), leitura nova não começa a menos de 3 s do fim. O que não coube sai como
  `parcial`, com as normas ou edições não lidas por extenso, ou como `falha`.
- Os `limites` gravados são os da cobertura atual do código nas fontes consultadas na rodada.
  Numa rodada parcial (`--fonte stf`), as outras fontes guardam os limites gravados antes.
  `--semente` regrava as três.

## Onde fica o estado

`novidades.js` é o pacote que o app lê: `{ geradoEm, fontes, itens }`. Entra nas listas de cópia
do site (`scripts/build.mjs`, também na casca do service worker) e do bundle nativo
(`scripts/build-macos.mjs`).

`sentinela/estado.json` é o diário do servidor. Fica na raiz, fora das listas de cópia: não vai
para `public/` nem para o app. Não mora em `dados/`, porque lá ficam as fatias imutáveis dos
acervos, que o build publica inteiras e o service worker serve como cache-first.

A função da Vercel não leva o diário. Sem ele, o motor recua para `CT_NOVIDADES.fontes`, que
guarda as mesmas datas. Assim uma falha no botão não apaga o último sucesso.

O que a pessoa marca fica em `catedra:novidLidas` (ver "Onde a pessoa vê").

## Quem faz o quê

### Workflow do GitHub Actions — detecta e incorpora

`.github/workflows/sentinela.yml`, nesta ordem:

1. **Ponto de partida.** Guarda o `juris-index.js` da `main`, o acervo de antes. Com PR aberto
   no branch fixo `sentinela/atualizacoes`, traz dele só o `novidades.js` e o
   `sentinela/estado.json`: o acervo é sempre reincorporado a partir da `main`. Sem PR aberto,
   olha o último PR fechado do branch: se foi fechado sem merge, guarda o `novidades.js` e o
   acervo dele (ver "PR fechado sem merge").
2. **Incorporação.** Roda `python3 scripts/atualizar-informativos.py`, sempre, quaisquer que
   sejam as fontes pedidas. O script anexa os julgados novos a `juris-index.js` e
   `juris-text.js` e regenera `semana-juris.js` e as fatias (`dados/juris-text/`,
   `dados/indice.json`). Não há `|| echo`: se o script cair, o job fica vermelho, o resumo diz
   que isso não é "nada novo" e nenhum PR sai.
3. **Trava do recuo.** Com PR aberto, `--conferir-recuo` compara o acervo da rodada com o do PR,
   edição por edição. Acusa a última que recuou e também a edição do meio que o PR trazia e esta
   rodada não trouxe. Edição que a própria `main` tirou não conta (`--desde`, o acervo de antes).
   Com recuo, o job para e o PR fica como está: vazio nunca apaga cheio.
4. **Trava do carimbo.** Se o acervo ficou igual ao já proposto, ou ao da `main` quando nada
   entrou, as fatias e o índice regerados voltam à versão de lá. Só a data "gerado" mudaria, e
   data não é novidade.
5. **PR recusado como referência.** Sem PR aberto e com o último fechado sem merge,
   `--novas-alem-de` diz se a incorporação desta rodada trouxe edição que nem a `main` nem o PR
   recusado tinham. Só essa edição conta como acervo mudado. A resposta vem na última linha
   (`novas=sim` ou `novas=nao`); qualquer erro derruba o passo, nunca vira "nada novo".
6. **Detecção.** Roda `scripts/sentinela.mjs` nas fontes pedidas, detectando os informativos a
   partir do acervo de antes (`--detectar-desde`). A edição que acabou de entrar vira item e
   sai, na mesma rodada, "já no JURIS". Edição que existe e não entrou fica "Conferir", também
   quando é uma lacuna no meio da série: o PR não afirma o que não traz.
7. **Aviso.** Fonte que falhou deixa aviso na execução: falha não é "nenhuma novidade".
8. **PR.** Com item novo, baixa ou acervo mudado, confere chaves
   (`scripts/verificar-segredos.mjs`) e cria ou atualiza o PR de rascunho. Ele leva
   `juris-index.js`, `juris-text.js`, `semana-juris.js`, `dados/juris-text/`,
   `dados/indice.json`, `novidades.js` e `sentinela/estado.json`. Sem as fatias, "Abrir no
   JURIS" dos julgados novos abria sem texto (o defeito do PR #81).
9. **Rascunho de novo.** Commit novo num PR já marcado como pronto devolve o PR a rascunho.

Rodada sem item novo, sem baixa e sem acervo mudado não abre nem atualiza PR. O workflow nunca
mescla. Não toca `leis-seca.js`. O job tem teto de 60 minutos.

Agendamento: diário às 12h UTC (9h de Brasília, 8h de Porto Velho). Só dispara a partir da `main`.

**Desligado por padrão.** O job agendado só roda com a variável do repositório
`SENTINELA_DIARIO` igual a `ligado`. O disparo manual roda sempre. Em 01/10/2026, o repositório
não tinha essa variável.

Por que desligado: cada rodada gasta minutos do GitHub Actions, e ligar é decisão da dona. Em
repositório privado, os minutos são cobrados. O Actions deste repositório ficou parado por
cobrança de 16/09/2026 (UTC) a 01/10/2026.

Como ligar:

1. No GitHub, no repositório: Settings → Secrets and variables → Actions → aba Variables.
2. New repository variable. Nome: `SENTINELA_DIARIO`. Valor: `ligado`.
3. Ou no terminal: `gh variable set SENTINELA_DIARIO --body ligado`.

Para desligar, apague a variável ou troque o valor.

Rodada manual, que também gasta minutos: Actions → "Sentinela das fontes oficiais" → Run
workflow, ou `gh workflow run sentinela.yml`.

Não verificado: se os servidores do GitHub alcançam o Planalto, o STF e o STJ. O STF exige
User-Agent de navegador. A primeira rodada manual dirá.

#### O PR do robô e a CI

- Requisito cumprido: a opção "Allow GitHub Actions to create and approve pull requests"
  (Settings → Actions → General → Workflow permissions) foi ligada pela dona em 01/10/2026.
  Sem ela, o PR não seria criado.
- O PR nasce rascunho. PR aberto ou atualizado pelo `GITHUB_TOKEN` não dispara os workflows de
  teste.
- `.github/workflows/testes.yml` roda também em `ready_for_review`: a CI corre quando a dona
  marca o rascunho como pronto.
- Se o robô empurra commit novo num PR já marcado como pronto, o PR volta a rascunho. A CI roda
  de novo quando a dona marcar pronto outra vez.

#### PR fechado sem merge

Quando não há PR aberto e o último PR do branch foi fechado sem merge, o workflow passa o
`novidades.js` dele ao motor (`--ja-propostos`). Esses itens não contam como novos e, sozinhos,
não reabrem PR.

No acervo, a referência também é o PR recusado, mas acervo diferente dele não basta. Só reabre
PR a edição que a incorporação desta rodada trouxe e que nem a `main` nem o PR recusado tinham
(`--novas-alem-de`). Não reabrem PR:

- a rodada sem rede, que fica com o acervo da `main`;
- a rodada que trouxe menos edições que o PR recusado;
- o acervo que a `main` ganhou por outro caminho depois do fechamento, como um PR de
  informativos feito à mão (o #176) ou uma correção de auditoria em `juris-index.js`.

O que o PR recusado trazia volta junto com a próxima novidade de verdade, para a dona rever.
Fechar o PR silencia o que ele trazia até lá, não para sempre. Não existe lista permanente de
itens recusados.

### Rotina semanal na nuvem — falha desde 07/09/2026

- Rotina do Claude `trig_01SpBvS1YZNyCqS8DHWeQpZc`, toda segunda às 7h de Porto Velho (11h UTC).
- Roda `scripts/atualizar-informativos.py` e abre PR de rascunho. Erro vira issue.
- O ambiente na nuvem bloqueia a conexão com `www.stf.jus.br` e `processo.stj.jus.br`: o proxy
  de saída responde 403. O script imprime "NOVOS: 0" e termina, mas é falha de conexão, não
  ausência de edição nova (issue #173).
- Cada falha abriu uma issue: #43 (07/09/2026) e #68 (11/09/2026), fechadas; #84 (14/09/2026),
  #113 (21/09/2026) e #173 (28/09/2026), abertas.
- Entre o PR #71, de 11/09/2026 (STF 1223 e 1224, STJ 897 a 900), e o PR #176, feito à mão no
  Mac e mesclado em 01/10/2026, nenhum informativo entrou no acervo.

Na prática, ela não incorpora nada. Quem incorpora é o workflow do sentinela, quando ligado.
A rotina continua agendada. Desligá-la é decisão da dona: se a rede dela voltar com o workflow
ligado, os dois anexariam os mesmos julgados ao `juris-index.js`, em PRs que conflitam.

### À mão, no Mac

Do Mac, a rede alcança os tribunais:

```bash
python3 scripts/atualizar-informativos.py --dry-run   # mostra o que entraria, sem gravar
python3 scripts/atualizar-informativos.py             # anexa a juris-index.js e juris-text.js
```

O script também regenera `semana-juris.js` e `dados/juris-text/`: tudo vai no mesmo PR, com a
suíte verde. Foi assim que o PR #176 nasceu. Ele também corrigiu o script na `main`: o script
lia o último STJ com `número < 900` e ganhou `--corpus`, que mostra onde cada série parou, sem
rede.

### Botão "Buscar atualizações agora" — `/api/sentinela`

- Função serverless na Vercel. Usa o mesmo motor e não grava nada.
- Uma fonte por pedido: `GET /api/sentinela?fonte=planalto|stf|stj`. A tela pede as três em
  paralelo e junta as respostas.
- Exige conta: `Authorization: Bearer <token do Supabase>`. Sem sessão, responde 401 com "Entre
  na sua conta do Cátedra para buscar atualizações." No modo "Usar sem conta", o botão não funciona.
- Tem os portões de `api/complete.js` e `api/tts.js`: beta (`BETA_EMAILS` e `meu_email_liberado`)
  e conta bloqueada (`meu_acesso_bloqueado`), ambos com 403. `meu_acesso_bloqueado` inclui o
  interruptor global da IA do painel: pausar a IA também pausa o botão, exceto na conta de
  administração, que continua consultando.
- Não conta na cota da IA: não grava em `ai_uso`.
- Guarda o resultado de cada fonte por 10 minutos, na instância da função. Apertar de novo nesse
  intervalo devolve o resultado guardado, marcado com `doCache` e `consultadoHa`. Falha não é
  guardada: tentar de novo consulta de verdade. Pedidos simultâneos viram uma consulta só.
- O último sucesso vem do pacote implantado ou, se for mais recente, do cache da instância. Uma
  falha depois da janela de 10 minutos não o apaga.
- Prazo: o motor recebe 45 s, contados antes dos portões. Uma rede de segurança responde aos
  53 s. O que não coube volta em JSON como `parcial` ou `falha` ("tempo esgotado…"), nunca como
  o 504 mudo da Vercel. `vercel.json` dá `maxDuration` de 60 s.
- Com alguma fonte em `falha`, a resposta é 200 com `ok: false` e a fonte em `fontesComFalha`.
- Só `GET`; outro método recebe 405. Fonte desconhecida recebe 400. `OPTIONS` recebe 204.
- CORS para o app do Mac, que carrega por `file://` sem acesso universal:
  `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: authorization` e
  `Access-Control-Allow-Methods: GET, OPTIONS`. Não há cookie (o token vai no cabeçalho), então
  `*` não abre CSRF. A resposta 200 sai com `cache-control: no-store`.
- Endereço: na web, a mesma origem; nos apps, o `CATEDRA_API_BASE` que `scripts/build-macos.mjs`
  injeta.
- Na web, o service worker (`sw.js`) não guarda nem devolve `/api/sentinela`. Sem rede, o
  pedido falha e a tela diz que não conseguiu consultar: uma consulta antiga nunca volta
  offline como se fosse nova. A tela também pede cada consulta num endereço único, com
  `cache: 'no-store'`.
- `vercel.json` leva junto `{leis-seca.js,juris-index.js,novidades.js}` (`includeFiles`).
- Só funciona depois que a Vercel publicar a função. Ela só publica commit verificado: o merge é
  pelo GitHub (`gh pr merge --merge`). Antes disso, a tela mostra "não foi possível consultar".

O botão só consulta. Nenhuma alteração é aplicada ao acervo.

## Onde a pessoa vê

### No Início — bloco "Fontes oficiais" (`#ct-fontes-oficiais`)

Bloco compacto. Aparece sempre nas áreas de carreira jurídica, as que têm jurisprudência:
Jurídica, Policial, Fiscal e tributária, Controle externo e Administrativa (`VIEW_EXIGE`
`novidades: 'jurisprudencia'`, em `area-registry.js`). Em 01/10/2026, só a Jurídica é oferecida
a quem escolhe área (`PUBLICAS`); as outras quatro valem para quem já estava nelas. O bloco
aparece mesmo sem varredura publicada. Nesse caso, o cabeçalho diz "nenhuma varredura publicada
ainda" e cada fonte, "Nunca consultada". Mostra:

- a situação de cada fonte (Planalto, STF e STJ), no vocabulário abaixo;
- três contadores: fontes ok, com falha ou parcial e itens a conferir;
- a frase "Detecção automática, publicação assistida.";
- até três mudanças de lei que a pessoa ainda não marcou, as que pedem conferência primeiro,
  com "Abrir no LEGIS" e "Já vi". Informativo novo só entra na contagem. O bloco "O que mudou
  esta semana", logo acima, mostra os julgados já no acervo e, com atalho para a Central,
  quantas edições novas aguardam o acervo;
- o botão "Ver revisão oficial" (`#ct-of-abrir`, `oficialPainelAbrir`). No código deste PR, ele
  leva à Central de novidades.

A dona decidiu, em 01/10/2026, manter as duas: a Central de novidades e o painel "Revisão
oficial" (dialog `#ct-revisao-oficial`). O painel é da sessão "Interface de atualização
oficial" e vem empilhado sobre este trabalho (branch `revisao-oficial-transversal`). Quando ele
entrar, o mesmo botão passa a abrir o painel.

### Central de novidades — em "Mais opções"

Fica em "Mais opções" no menu lateral e na paleta de comandos, só nas mesmas áreas do bloco do
Início. O título da tela é "Central de novidades"; abaixo de 900 px de largura, "Novidades".

- No topo, o título "O que mudou nas fontes oficiais", a frase da dona, literal, igual à do
  começo deste documento ("Atualização assistida: …"), e três números: no total, não lidas e a
  conferir.
- Por fonte: o que monitora, o que não cobre, as 14 normas do Planalto, última tentativa, último
  sucesso, resultado e erro.
- "Buscar atualizações agora", para as três fontes ou para uma. O resultado separa novidades,
  itens que exigem revisão e fontes que responderam, falharam ou responderam em parte, e diz
  "Alterações aplicadas ao acervo: nenhuma". Fonte que falhou ou respondeu em parte ganha
  "Tentar de novo".
- Abrir a Central não consulta nada sozinho: só o botão chama `/api/sentinela`.
- `Parcial` e `Falhou` são lacunas, não sucesso. Com qualquer uma, a Central não diz "nada de
  novo" nem "Nenhuma mudança registrada".
- Cada mudança de lei diz quais conteúdos da pessoa toca: edital, revisões, sessões, ciclo e
  leitura ativa, com atalho para cada um.
- Filtros por fonte, tipo, disciplina, norma, período, assunto e "Só não lidas". Em cada item:
  "Comparar antes e depois", "Abrir o texto oficial", "Abrir no LEGIS" (mudança de lei), "Abrir
  no JURIS" (informativo já incorporado), "Agendar revisão", "Marcar como lida" e "Marcar como
  conferido". Item conferido ganha "Manter em revisão": a marca volta a lida, e o item volta a
  conferir.
- "Abrir o texto oficial" só aceita `https` em `planalto.gov.br`, `stf.jus.br` e `stj.jus.br`. No
  Mac e no iPad, abre no navegador do sistema.
- "Abrir no LEGIS" usa o mesmo canal das revisões: abre a aba nativa no Mac e no iPad e mantém a
  volta à origem. Informativo ainda não incorporado não tem botão de acervo, só o texto oficial.
- "Agendar revisão" só age com clique, uma vez por novidade, e pode ser desfeita. Nada muda no
  planejamento sem a pessoa pedir.

### Vocabulário único (Início e Central; o painel "Revisão oficial" usa o mesmo)

| Situação | Rótulo |
| --- | --- |
| fonte com `novidades` | Detectado |
| fonte com `sem-novidade` | Sem novidade |
| fonte com `parcial` | Parcial |
| fonte com `falha` | Falhou |
| fonte sem consulta (`resultado: null`) | Nunca consultada |
| item com `incorporado: true` | No acervo, com o selo de `incorporadoTxt` ("já no LEGIS" ou "já no JURIS") |
| item marcado pela pessoa como conferido | Conferido |
| item com `parcial: true` | Parcial |
| item com `revisar: true` | Conferir |
| os demais itens | Detectado |

A ordem da tabela é a precedência: vale a primeira linha que serve. Item parcial nunca aparece
como "No acervo". "No acervo" usa a mesma cor de "Conferido", e os dois ficam fora de "a
conferir".

### O que fica gravado

`catedra:novidLidas`: lista de `{id, up, st}`, com `st` igual a `'lida'` ou `'conferido'`.
"Marcar como lida" e "Já vi" gravam `'lida'`, sem rebaixar item conferido. "Marcar como
conferido" grava `'conferido'`, que também conta como lida. Registro antigo sem `st` vale como
lida. A lista é global (não muda com a área de estudo), entra no autosave e sincroniza entre
aparelhos pela regra dos arrays com `id` (`ARRAY_ID` em `auth.js`). Filtros, busca e resultado da
consulta são só de tela.

## Primeira publicação

- Por decisão da dona em 01/10/2026, o `novidades.js` sai sem nenhum item.
- Ele traz a cobertura de cada fonte (rótulo, o que monitora, limites e, no Planalto, as 14
  normas), com datas e resultado nulos. O Início e a Central mostram "Nunca consultada" e o que
  não é coberto.
- É gerado por `node scripts/sentinela.mjs --semente`, nunca à mão. O `sentinela/estado.json`
  começa sem nenhuma fonte (`"fontes": {}`).
- Nada da varredura de 15/09/2026 entra. Ela nunca foi revisada contra as fontes e tinha defeitos
  medidos: 2 normas modificadoras erradas, 4 "alterações" que eram só recorte e o limite antigo
  do STJ.

O que essa varredura mostrou continua fora do app. Ela achou 46 diferenças no Planalto:

- 37 no CTN, 32 delas com a "Lei Complementar nº 236, de 2026" como norma modificadora;
- 9 no CPC, 8 delas com a "Lei nº 15.484, de 2026".

As duas modificadoras antigas que ela apontou (CTN art. 174 e CPC art. 1.030) estavam erradas:
o texto novo dos dois traz a lei de 2026. O `leis-seca.js` não tem nenhuma das duas leis. Até
uma rodada revisada, a lei seca do CTN e do CPC no app pode estar defasada.

A primeira rodada revisada deve começar por essas duas normas. A primeira novidade entra por PR
revisado item a item contra a fonte oficial: o PR de rascunho do workflow, ou uma rodada manual
(`npm run sentinela`) seguida de revisão, suíte completa e PR. Mesmo depois disso, o sentinela só
avisa: corrigir a lei seca é regravar `leis-seca.js` com `scripts/build-leis-seca.mjs`, e nenhuma
automação faz isso (ver "Pendências conhecidas").

## Como revisar um PR do sentinela

1. Conferir na fonte oficial todo item com `revisar: true`: vigência não informada, comparação
   parcial, recorte, norma modificadora não identificada e informativo detectado que não entrou
   no acervo.
2. Fonte com `falha` ou `parcial` no relatório não quer dizer "nada mudou". Ler o erro.
3. Se o PR traz informativos incorporados, conferir que `juris-index.js`, `juris-text.js`,
   `semana-juris.js`, `dados/juris-text/` e `dados/indice.json` vieram juntos. Conferir, por
   amostragem, os julgados incorporados contra o Informativo oficial.
4. Marcar o rascunho como pronto: é isso que dispara a CI (`testes` e `Testes WebKit (Safari)`).
5. Rodar também `node tests/sentinela.mjs` e `node scripts/verificar-segredos.mjs`.
6. Depois do merge, build e instalação no Mac e no iPad a partir da `main` atualizada.

## Comandos

```bash
npm run sentinela:dry                  # consulta as três fontes (rede) e não escreve nada
npm run sentinela:dry -- --json        # o mesmo, com o relatório em JSON
npm run sentinela                      # consulta e grava novidades.js e sentinela/estado.json
npm run sentinela -- --fonte planalto  # uma fonte só (planalto, stf ou stj)
npm run sentinela -- --fonte stf,stj
npm run sentinela -- --ja-propostos <novidades.js de PR fechado sem merge>
npm run sentinela -- --detectar-desde <juris-index.js de antes da incorporação>
node scripts/sentinela.mjs --conferir-recuo <juris-index.js do PR aberto> --desde <da main>
                                       # sem rede; sai 1 no recuo, 2 se não consegue comparar
node scripts/sentinela.mjs --novas-alem-de <juris-index.js do PR recusado> --desde <da main>
                                       # sem rede; última linha novas=sim ou novas=nao
node scripts/sentinela.mjs --semente   # sem rede: regrava novidades.js sem itens, só a cobertura
node tests/sentinela.mjs               # régua do motor, sem rede
python3 scripts/atualizar-informativos.py --dry-run   # informativos que entrariam, sem gravar
```

Use `npm run sentinela` só quando a intenção for atualizar o pacote. O resultado passa por
revisão antes do merge.

## Régua do motor

`tests/sentinela.mjs` roda sem rede: 240 casos, verdes em 02/10/2026 (os da Fase 2 em
`tests/sentinela-colecoes.mjs`, com as fixtures de `tests/fixtures/stf-rg`, `stj-repetitivos`,
`sumulas` e `planalto`, cada uma com a data de coleta no manifesto). Usa recortes reais do
Planalto medidos em 15/09/2026 e os títulos e status das páginas oficiais dos informativos
baixadas em 01/10/2026 (`tests/fixtures/informativos/manifesto.json`). Edição que não foi
baixada é simulada no mesmo formato. Está ligado à suíte Chromium (`tests/run.mjs`). Cobre:

- inclusão, alteração, revogação anotada no caput e artigo sumido como leitura suspeita;
- rótulo de margem do Planalto, remissão em minúscula e artigo cortado no teto;
- recorte sem mudança do próprio artigo, sem norma modificadora emprestada do vizinho;
- o texto próprio cortado só no cabeçalho de outro número, com o CF art. 101 real (redação
  antiga e nova sob o mesmo cabeçalho);
- norma modificadora só da diferença, sem empréstimo da anotação antiga, e o nome dela cortado
  no ")", no "(" ou "§" seguinte e na data;
- vigência só com a data colada ao marcador, e produção de efeitos à parte;
- leituras divergentes e parse suspeito;
- id estável diante de rótulo de margem novo;
- os títulos reais do STJ (901, 902, 903, extraordinárias 29 e 33, página genérica) e do STF
  (1224, 1225, 1230 e o 404 da 1231);
- a âncora não reconhecida, os status 403, 500 e 503, e as extraordinárias sempre consultadas;
- falha que nunca vira "sem novidade" e preserva o último sucesso, no carimbo e no caminho
  inteiro do `rodar()`;
- prazo esgotado no Planalto e no STJ;
- baixa dos informativos pela presença da edição (a lacuna fica "Conferir") e das mudanças de
  lei, com o texto do selo; os casos que não podem recebê-la (item parcial, artigo do acervo no
  teto, página que voltou atrás, mudança substituída, leitura não conclusiva); e a baixa
  desfeita quando o acervo não tem a edição;
- contagem de `baixas` e `--ja-propostos`;
- o caminho do workflow: incorporar e depois detectar a partir do acervo de antes
  (`--detectar-desde`); a trava de recuo, edição por edição (`--conferir-recuo`); e o PR
  recusado, que só volta com edição nova de verdade (`--novas-alem-de`);
- cobertura declarada, as 14 normas do Planalto e limites gravados iguais à cobertura do código;
- `novidades.js` igual à semente enquanto não há varredura publicada;
- o build da lei seca usando o parser de `scripts/lib/planalto.mjs`, sem cópia própria;
- nenhum certificado embutido vencendo, e a verificação TLS sempre ligada (S12);
- comparação por artigo com trechos REAIS do CTN de 01/10/2026 (S29): a LC 236 no 107 e não no
  106, no 194 e não no 193; a alteração do 146; o 211-A inteiro; a remissão "art. 927" sem
  fantasma; artigo além do teto do acervo sem "inclusão" falsa;
- acervo sem extraordinária, "Vigência" solto, erro de rede por extenso e o carimbo da leitura
  completa (S30);
- coleções (S22–S28 de `tests/sentinela-colecoes.mjs`): cada tipo novo com o recorte real que o
  produz; a linha de base; a âncora e as travas; o orçamento do botão (cauda dos repetitivos,
  GET condicional do PDF); a fonte com o pior resultado das coleções; a falha de uma coleção que
  não apaga as outras; a baixa contra o acervo; o termo do "Abrir no JURIS".

`tests/novidades-central.mjs` cobre a tela, nas suítes Chromium e WebKit: o pacote nas listas
de cópia e na casca do service worker, `catedra:novidLidas` (global, no autosave e no
`ARRAY_ID`), o vocabulário único, filtros, comparação, links oficiais, contraste medido e a
Central que não consulta nada sozinha. A parte (n) cobre as coleções: os tipos novos, a situação
de cada coleção no cartão da fonte, o filtro de coleção, a tese antes/depois, as datas oficiais e
"Abrir no JURIS" com o título do verbete. `node tests/novidades-central-so.mjs` roda só ela.

## Relação com a auditoria do JURIS

O sentinela não audita o acervo. Ele compara a fonte com o texto do bundle e aponta a diferença.
A auditoria jurídica do CátedraJURIS (15 a 23/09/2026) está em:

- `docs/auditoria-juris/FECHAMENTO-2026-09-23.md`: estado final e a seção "Limites de cobertura
  ainda abertos";
- `docs/auditoria-juris/RELATORIO.md`: registro dos lotes 1 a 16. Entra pelo PR #178 (branch
  `regras-agentes-auditoria`, aberto em 01/10/2026). Até ele ser mesclado, o arquivo não existe
  na `main`.

O que continua valendo:

- A formulação correta é "saldo confirmado encerrado, auditoria integral ainda limitada pelas
  fontes". Não é "acervo integralmente auditado".
- O sentinela não fecha nenhum dos limites abertos: Jurisprudência em Teses 250 a 283
  (345 verbetes); 192 processos de informativos sem edição e 13 itens não localizados; 22 itens
  de Teses, 11 repetitivos e 6 de texto extra posteriores a dezembro de 2024; 49 súmulas do STJ
  sem fonte local e 4 processos de turma; 2.341 transcrições de banca.
- O SCON continua necessário para acórdãos, para as Teses 250 a 283 e para parte das pendências
  que a rota BDJur não cobre.
- Transcrição de banca preserva o texto oficial. Divergência recebe nota anexa, não reescrita
  silenciosa.
- Item inconclusivo por falta de fonte acessível continua inconclusivo. Não vira erro confirmado
  nem "sem novidade".

## Pendências conhecidas

- **Rede da rotina na nuvem** (issue #173): o ambiente bloqueia `www.stf.jus.br` e
  `processo.stj.jus.br`. A #173 registra também que o script usa `urllib` puro e não lê o proxy
  nem o certificado do ambiente.
- **Falha de rede no script de incorporação.** Em `scripts/atualizar-informativos.py`, a
  conexão que cai depois de 3 tentativas (status 0) conta como edição que não saiu. Qualquer
  resposta diferente de 200 também conta, na hora e sem nova tentativa: o 403 do escudo do STF,
  um 503. Duas seguidas encerram a série; uma só deixa lacuna. O script termina com "NOVOS: 0"
  e sai sem erro. No workflow, isso não vira silêncio: a edição detectada e não incorporada fica
  "Conferir", também a da lacuna; a fonte que não respondeu ao sentinela sai `falha`, com aviso;
  e a trava do recuo protege o PR aberto. Fora do workflow, o script sozinho não avisa. Este PR
  não muda o script.
- **Lei seca do CTN e do CPC**: as mudanças da LC 236/2026 e da Lei 15.484/2026 não estão em
  `leis-seca.js`.
- Nenhuma automação atualiza a lei seca do LEGIS. Regravar `leis-seca.js` pode deslocar as
  marcações da leitura ativa, cujo id usa a posição do dispositivo na lei.
- Certificado do STF: desde 01/10/2026 o STF serve a cadeia completa da Sectigo (folha até
  11/04/2027), e o intermediário GlobalSign que ia embutido saiu (`CAS_EXTRAS` vazio). Se o STF
  voltar a mandar cadeia incompleta, a fonte passa a `falha` ("o certificado da fonte não fecha a
  cadeia de confiança") até alguém embutir o intermediário. A receita está no cabeçalho de
  `scripts/lib/tls-fontes.mjs`.
- Vigência: o rótulo "Vigência" SOLTO logo depois de uma anotação (o link do Planalto para a
  cláusula de vigência da lei modificadora) conta como marcador sem data: o item fica
  `indeterminada`. Medido no CPC de 01/10/2026: arts. 927, 932, 1.035-A e 1.042 (Lei 15.484/2026)
  saíam "em vigor — sem marcador". O sentinela não segue o link para ler a cláusula da lei
  modificadora (a Lei 15.484 entra em vigor 30 dias após a publicação de 04/08/2026).
- Coleções: a primeira rodada da RG compara com a linha de base de 25/09/2026 e deve trazer as
  mudanças oficiais desde então (10 itens na conferência de 01/10/2026). A Vercel alcançar
  `portal.stf.jus.br`, `www.stj.jus.br` e o portal de repetitivos não foi verificado: se não
  alcançar, a coleção sai `falha` no botão, nunca "sem novidade".
- O JURIS nativo (corpus do VadeMecumJuris) não recebe os informativos novos, nem pelo workflow
  nem pela rotina.

## O que a dona decide

1. **Ligar a rodada diária** (`SENTINELA_DIARIO=ligado`, ver "Como ligar"). Gasta minutos do
   Actions. Antes, uma rodada manual mostra se os servidores do GitHub alcançam os tribunais.
2. **Desligar a rotina semanal na nuvem** (`trig_01SpBvS1YZNyCqS8DHWeQpZc`). Ela falha toda
   segunda e abre issue. Com o workflow ligado, os dois automatismos fariam o mesmo trabalho.
3. **Primeira rodada revisada.** Quando fazer, começando pelo CTN (LC 236/2026) e pelo CPC
   (Lei 15.484/2026), e se a lei seca dessas duas normas deve ser regravada, sabendo do risco
   para as marcações da leitura ativa.
4. **Recusar item para sempre.** Em 01/10/2026, fechar o PR silencia os itens só até a próxima
   novidade de verdade.
5. **Repositório e `main`.** Em 01/10/2026, o GitHub mostrava o repositório como público e a
   `main` sem proteção de branch. As duas coisas contrariam a configuração de 10/09/2026 (privado,
   `main` com PR e as duas checagens obrigatórias). Em repositório público, os runners padrão não
   cobram minutos.

## Revisão oficial nos três produtos (01/10/2026)

O pacote `novidades.js` é lido por um módulo só, `revisao-oficial.js` (`window.CT_REVISAO_OFICIAL`),
carregado pelo host, pelo `legis-web.html` e pelo `juris-web.html`. Ele dá o vocabulário único:

| Status | Quando |
|---|---|
| Detectado | mudança achada na fonte, sem pendência própria |
| Conferir | `revisar:true` (vigência sem data, informativo, comparação no teto) |
| Conferido | a pessoa marcou (estado `catedra:novidLidas`, `st:'conferido'`) |
| Parcial | comparação parcial (artigo no teto) ou fonte que respondeu em parte |
| Falhou | a consulta à fonte não deu certo (só fonte, nunca item) |

- **Cátedra**: diálogo "Revisão oficial" (`#ct-revisao-oficial`), aberto por `oficialPainelAbrir` — o
  botão "Ver revisão oficial" do resumo do Início (PR #175). Filtros Todos / Precisa revisar / LEGIS /
  JURIS / Falhas e parciais; "Cobertura e limites" sempre visível.
- **LEGIS**: aba "Mudanças oficiais" — agrupada por norma, texto anterior × atual com só o trecho
  mudado destacado, vigência futura, "Detectado no Planalto em …".
- **JURIS**: aba "Informativos oficiais" — fila editorial por tribunal (e ramo, quando o item traz),
  com "Ver no acervo", "Registro oficial" e "Marcar como conferido".
- Abrir de um item no host leva `?oficial=<id>` (1ª carga) ou `ctOficialAbrir` (iframe vivo); o
  satélite marca pedindo ao host `ctOficialMarcar` (o host é o dono de `catedra:novidLidas`).

Pendências: o LEGIS e o JURIS **nativos** (SwiftUI, Mac/iPad) ainda não têm as abas; lá o painel
do host abre a busca do item. Os subtipos "possível novo verbete"/"possível atualização de verbete"
já têm lugar na fila (`subtipo`), mas o sentinela ainda não cruza edição × verbete.
