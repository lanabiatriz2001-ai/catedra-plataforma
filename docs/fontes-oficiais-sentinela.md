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

Atualização conferida em 06/11/2026:

- STF: HTTP 200 com o número pedido no `<title>` identifica a edição; só HTTP 404 confirma ausência.
- STJ: o título agora é genérico também nas edições publicadas. A identificação vem do
  `span.clsInformativoTitulo`, com número e série corretos, junto dos blocos de julgados
  `clsIdentificaProcesso`. O formato antigo com número no título continua aceito.
- STJ sem edição: exige HTTP 200, título do Informativo, mensagem específica
  `clsCaixaMensagem` com “Nenhum documento encontrado!” e nenhum bloco de julgamento.
  Título genérico sozinho, menu, campo da última edição e parâmetro de pesquisa não comprovam ausência.
- Outra edição/série, resposta sem os elementos esperados, HTTP 403/429/5xx e falha de
  rede são falhas. A âncora de cada série precisa ser reconhecida antes das edições novas.
- O Sentinela consulta até 12 ordinárias (`--max-edicoes`) e três extraordinárias;
  duas ausências ordinárias consecutivas encerram a série. Mantém falhas nomeadas no diário.
- O importador `scripts/atualizar-informativos.py` confere também o parsing das âncoras,
  exige todos os campos dos julgados do STJ e interrompe a incorporação inteira antes de
  gravar se alguma série falhar. O limite de busca sem confirmação do fim também é erro.
  Falha não imprime `NOVOS: 0`. Se um gerador falhar depois da coleta, o lote de índice,
  textos e derivados é restaurado, permitindo uma nova tentativa completa.
  HTTP 5xx e falhas de transporte têm tentativas limitadas;
  HTTP 403 não é repetido nem contornado.
- Os textos explicativos novos são guardados sem o antigo corte de 1.500 caracteres.
  Os registros anteriores permanecem intactos. Data como `1º/9/2026` é normalizada.
- As fixtures de `tests/fixtures/informativos/2026-11-06/` guardam recortes oficiais,
  URLs, status, contagens e hashes; `tests/informativos-leitura.py` e
  `tests/sentinela.mjs` cobrem resposta real, busca vazia, outra série e respostas incompletas.
- Resultado da rodada: **STF 1235 (4 notas/julgados) e STJ 908 (10)**. STF 1236/1237
  responderam 404; STJ 909/910 e extraordinárias 34/35/36 responderam busca vazia.
  A extraordinária 33 foi relida como âncora (21 julgados), sem duplicação.
- A planilha oficial do STF foi consultada com sucesso (11.642 linhas); permanece o
  aviso histórico do **STF 1225: quatro notas na planilha e três no acervo**. Essa
  revisão histórica não é resolvida pela incorporação das edições novas.

O PR #200 estava aberto em rascunho, na branch `sentinela/atualizacoes`, ponta
`038c3d2`, quando este trabalho começou. Suas contribuições foram integradas à branch
da correção sobre `origin/main` (`d499913`). A entrega usa PR separado porque o workflow
atual refaz a branch automática a partir da main e só recupera os registros do Sentinela:
uma rodada poderia retirar código e acervo ainda em revisão. O #200 permanece intacto.

O agendamento local `scripts/sentinela-mac.sh` continua responsável pela **detecção**;
a incorporação desta rodada foi executada explicitamente no Mac. Não houve alteração
de agendamento, ativação de incorporação no Actions, merge, publicação ou instalação.
Repetitivos, RG, súmulas e Planalto não foram consultados nesta rodada; seus erros e
carimbos anteriores foram mantidos. Não se declara atualização geral dessas coleções.

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

> Em 07/10/2026 (commit `adadbab`, "Simplifica início…") esse bloco saiu do template do Início; os
> dados continuam no render e na Central. Desde 25/11/2026, o Início só mostra um chip, descrito
> abaixo.

### No Início — chip "conferidas aguardando o acervo" (25/11/2026)

Um chip na fileira do cabeçalho do Início, ao lado da ofensiva e do ENAM: "N novidade(s)
conferida(s) aguardando o acervo →". Conta os itens que a pessoa marcou como conferidos e que o motor
ainda não incorporou (`conferidosAguardando` em `revisao-oficial.js`, sobre o `statusItem`): item já
"No acervo" não conta, e item de comparação parcial não conta nem conferido, porque o motor nunca dá
baixa em item parcial (`mesclarNovidades`) e o aviso ficaria aceso para sempre. Some com zero. O
toque abre a Central já filtrada nesses itens (filtro "Situação", só de tela) e desce até esse
filtro, com os itens logo abaixo. O filtro e o chip usam a mesma régua (`aguardaAcervo`): a lista
filtrada mostra exatamente os itens que o chip conta. Entrar na Central por outro caminho (menu,
paleta, notificação, também saindo do LEGIS ou do JURIS da web) desliga o filtro. Só a pílula
"Voltar à Central de novidades" do LEGIS e do JURIS o mantém: `_voltarDoAcervo` diz ao `_irPara`
o recorte em que a Central estava, e o `_irPara` não adivinha pela tela de partida. A marca não
incorpora nada: incorporar continua sendo do motor, depois de conferido na fonte. Com baixa
estimulação o chip continua, porque informa sobre o acervo e não cobra nada da pessoa.

Limite: o chip conta os itens que o app conhece — os do pacote publicado (`novidades.js`) e os da
busca ao vivo DESTA sessão, que não são gravados. Item da busca ao vivo marcado como conferido acende
o chip até o app fechar; ao reabrir (ou no outro aparelho, que recebe a marca pelo sync), o item não
está mais no app e o chip não o conta. Com o pacote ainda vazio, é o caso de toda novidade hoje.
Guardar esses itens é decisão pendente da dona (25/11/2026). Na lei do Planalto e no Informativo, a
busca ao vivo nunca devolve o item como "No acervo": quando o acervo recebe o texto (ou a edição),
ela só deixa de trazê-lo. Tema e súmula podem voltar "No acervo" (o `juris-index.js` vai junto com a
função). Por isso, uma cópia guardada precisaria de uma regra de saída, senão o chip ficaria aceso
depois da incorporação.

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
- Cada item diz, abaixo de "detectada em", a última varredura do diário dele, com data e hora do
  último sucesso. Vale o diário da coleção do item (Informativo, repercussão geral, repetitivos,
  súmulas) quando o pacote o traz, e a frase a nomeia: "Última varredura da coleção Repercussão
  geral (STF): …". A data dela não é a da fonte, que o cartão da fonte mostra ao lado com outro
  valor (uma coleção que falha deixa a fonte inteira "Falhou"). Sem diário da coleção, vale o da
  fonte: "Última varredura da fonte: …". Se esse sucesso foi uma leitura parcial (resultado
  `parcial`, que move o último sucesso com uma lacuna nomeada), a data ganha "(leitura parcial)".
  Se a última tentativa falhou depois do sucesso, a frase continua com "· última tentativa falhou
  em <data e hora>"; sem sucesso registrado, "nenhuma concluída"; sem dado no pacote, "não
  informada". A régua é `varreduraItem` e `varreduraTxt` de `revisao-oficial.js`. Falha do pedido
  inteiro feita neste aparelho (sem rede, servidor fora) o host grava só no diário da fonte; o item
  de coleção a reconhece por ser mais nova que o diário de todas as coleções (o motor carimba cada
  coleção que roda com a data da fonte) e mostra o último sucesso da coleção com "· última tentativa
  falhou em …". Coleção que ficou fora de uma rodada filtrada não herda a falha de outra.
- Com item conferido fora do acervo, os filtros ganham "Situação: Conferidas aguardando o acervo ·
  N", o mesmo recorte do chip do Início. Estado só de tela (não grava nada).
- O painel "Revisão oficial" mostra a mesma frase, na data curta do painel, e o link "Fonte
  oficial" (mesma lista de hosts, por `urlSegura`), que abre fora do app. O painel lê só o pacote
  publicado: item da busca ao vivo aparece na Central, não no painel.
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
- ~~**Lei seca do CTN e do CPC**: as mudanças da LC 236/2026 e da Lei 15.484/2026 não estão em
  `leis-seca.js`.~~ Resolvido em 25/11/2026: `leis-seca.js` e `leis-seca-areas.js` foram
  regravados (ver "Atualização de 25/11/2026").
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
  mudado destacado, vigência futura, "Detectado no Planalto em …" e, desde 25/11/2026, a frase da
  última varredura do item (a mesma do painel).
- **JURIS**: aba "Informativos oficiais" — fila editorial por tribunal (e ramo, quando o item traz),
  com a frase da última varredura do item, "Ver no acervo", "Registro oficial" e "Marcar como
  conferido".
- Nos três, o link da fonte ("Fonte oficial", "Ver no Planalto", "Registro oficial") só sai para
  `https` de host oficial (`fonteUrl`, por `urlSegura`); endereço `http` ou de outro host fica sem
  link.
- Abrir de um item no host leva `?oficial=<id>` (1ª carga) ou `ctOficialAbrir` (iframe vivo); o
  satélite marca pedindo ao host `ctOficialMarcar` (o host é o dono de `catedra:novidLidas`).

Pendências: o LEGIS e o JURIS **nativos** (SwiftUI, Mac/iPad) ainda não têm as abas; lá o painel
do host abre a busca do item. Os subtipos "possível novo verbete"/"possível atualização de verbete"
já têm lugar na fila (`subtipo`), mas o sentinela ainda não cruza edição × verbete.

## Como o sentinela se identifica (03/10/2026)

- **STJ:** identificador honesto (`Catedra/1.0 (+repositório; leitura de dados oficiais)`). Medido: o
  Informativo, os repetitivos e o PDF de súmulas respondem 200.
- **STF e Planalto:** identificador de navegador (Chrome). Com o honesto, o STF responde 403 no
  balanceador da AWS e o Planalto derruba a conexão. Por decisão da dona, os dois seguem lidos
  assim: páginas públicas oficiais, da rede dela, em volume baixo. O filtro do STF existe para
  barrar robôs, e esta é uma escolha consciente, registrada em `scripts/lib/tls-fontes.mjs`
  (`uaPara`). Se houver rota de dados abertos ou acesso formal, trocar.
## STF e STJ rodam no Mac (03/10/2026)

No GitHub Actions o STF e o STJ respondem HTTP 403 a qualquer pedido, inclusive às edições que
já estão no acervo; do Mac da dona, as mesmas requisições respondem 200. É bloqueio por endereço
de nuvem, e não se contorna (nada de proxy nem rotação de IP). Por isso:

- o workflow consulta só o **Planalto** por padrão (`stf,stj` fica para diagnóstico manual);
- o **Mac** roda `scripts/sentinela-mac.sh` todo dia às 06:40, por um LaunchAgent
  (`scripts/launchd/com.catedra.sentinela-stf-stj.plist`), num worktree dedicado. Ele parte do PR
  aberto, consulta só STF e STJ e envia um commit sobre a ponta do `sentinela/atualizacoes`, sem
  forçar. A rodada do Planalto preserva o que o Mac gravou, e vice-versa;
- se o Mac não rodar, o STF e o STJ aparecem com a última tentativa envelhecendo, nunca como
  "sem novidade". Log em `~/Library/Logs/catedra-sentinela-stf-stj.log`.

Instalar (uma vez):

```bash
mkdir -p ~/Library/Application\ Support/Catedra && cp scripts/sentinela-mac.sh ~/Library/Application\ Support/Catedra/
git worktree add --detach .claude/worktrees/sentinela-mac origin/main
sed "s#__REPO__#$PWD#g; s#__HOME__#$HOME#g" scripts/launchd/com.catedra.sentinela-stf-stj.plist > ~/Library/LaunchAgents/com.catedra.sentinela-stf-stj.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.catedra.sentinela-stf-stj.plist
```

Para o Mac acordar sozinho antes do horário (opcional, pede senha): `sudo pmset repeat wakeorpoweron MTWRFSU 06:35:00`.
## Planilhas oficiais (03/10/2026)

- **STF — planilha do Informativo** (`Dados_InformativosSTF.xlsx`, link "dados" da página oficial):
  conferência cruzada, só na rotina diária. GET condicional (304 sem corpo quando não muda; o ETag
  fica em `sentinela/retratos.json`, chave `stf.informativo`). Para cada uma das 12 edições mais
  recentes que o acervo tem, compara o número de notas da planilha (por título) com o do
  CátedraJURIS; se faltar nota, nasce o item `INF-STF-PLAN-<edição>` ("Conferir"), com os títulos
  da planilha, que recebe baixa quando o acervo alcançar a contagem. Foi assim que apareceu a
  ADI 7236 (Informativo 1225), ausente do acervo. A planilha NÃO substitui a sonda por número
  (que acha a edição no mesmo dia; a planilha sai cerca de 1 dia depois). Se ela não puder ser
  lida, o STF sai "parcial", com o motivo.
- **STJ — `Temas.csv` do Portal de Dados Abertos** (conjunto "precedentes-qualificados"): FILTRO
  das faixas de repetitivos. Nos dias comuns, só se lê a faixa em que o CSV mostra situação
  diferente da última leitura, tema novo, tema sumido ou repetido com situações diferentes, mais a
  cauda. Os itens continuam nascendo das fichas oficiais (o CSV como fonte dava 9 alarmes falsos
  em 12). Varredura completa: toda quarta-feira e sempre que o CSV falhar, vier com menos de
  1.400 temas ou estiver há mais de 3 dias sem regravação. A varredura filtrada não move o
  carimbo "última leitura completa".

## Atualização de 25/11/2026

Rodada manual, no Mac (de onde o STF, o STJ e o Planalto respondem).

- **Informativos.** Entraram 47 julgados: STF 1236 a 1238 e STJ 909 a 911. A extraordinária 33
  segue a última; 34 a 36 confirmadas ausentes. Acervo: 15.229 → 15.276 registros.
- **Duas mudanças de formato das fontes**, que travavam a incorporação desde 10/11/2026:
  - o STF publicou a 1236 com o `<title>` cortado em "Nº", sem o número. Só nesse caso (título
    sem número nenhum) a edição é reconhecida pelo cabeçalho do início do conteúdo
    ("INFORMATIVO STF Nº 1236/2026 Data de divulgação"). Título com o número de outra edição e
    número só em citação continuam sendo falha. A régua é a mesma no importador e no sentinela;
  - desde a 910 o STJ fecha o Informativo com a seção "PROPOSTA DE RELEVÂNCIA DA QUESTÃO
    FEDERAL": processo afetado, sem tese, com só Processo, Ramo e Tema. Esses blocos ficam fora
    do acervo e são contados (a soma julgados + propostas tem de bater com os blocos da página).
    Fora dessa seção, bloco sem Destaque continua sendo falha. Na 910 um julgado (Tema
    Repetitivo 1469) veio sem o campo "Ramo do Direito": entra sem ramo, que não se inventa.
  - Fixtures em `tests/fixtures/informativos/2026-11-25/`, com o hash da resposta integral.
- **Leitor do Planalto corrigido** (`scripts/lib/planalto.mjs`), em defeitos que vinham de antes e
  escondiam artigos e mudanças da lei. Conferido por agentes independentes contra o HTML oficial,
  lei a lei, e pelos casos S29h e S29i:
  - o código-fonte do Planalto às vezes quebra a linha entre "Art." e o número ("Art.\n146. A
    modificação…"), põe o ponto na linha do número ("Art" / ". 97."), separa ou dobra o ponto ("Art ."
    / "2º", IBS/CBS; "Art. ." / "182", CLT; "Art . 8º" na mesma linha, 22 artigos do DL 200) ou cola o
    traço no caput ("528 -Ocorrendo"). A linha "Art." não abria artigo e o artigo ia parar dentro do
    anterior — e,
    depois do teto de 4.000 caracteres, sumia. Eram cerca de 500 artigos em 25 das 49 leis (o CTN
    tinha 130 dos seus 218; a mudança da LC 236 no art. 146 nunca chegaria ao acervo);
  - etiqueta de formatação dentro do rótulo: "<strong>A</strong>rt. 107" (CP, extinção da
    punibilidade), "A<span>rt. 405" (CPP), "Art. 21</font><font>7" (CTN art. 217), e o ponto dobrado
    "Art. . 154" (14 artigos da CLT);
  - só "Art."/"Artigo" com inicial maiúscula abre artigo. A remissão "art. 927 da Lei…" no começo
    de linha virava um "artigo" à parte (687 no acervo, nenhum de verdade), levando junto o texto do
    artigo de onde saiu; o treino e a oral mostravam esse texto com o número errado. O sentinela já
    devolvia esses pedaços ao artigo anterior (`porArtigo`), então a comparação não muda de sentido;
  - o piso de tamanho (rótulo + 40 caracteres) cortava artigo curto de verdade: CPC 724 ("Da
    sentença caberá apelação.") e 1.001 ("Dos despachos não cabe recurso."), CPP 202 e 262. Agora
    fica também o que tem 12 ou mais caracteres de texto próprio, fora as anotações (entre parênteses
    ou em link solto, como "Produção de efeitos") — e desde que a entrada seguinte não tenha o mesmo
    número: nesse caso ela é a cabeça da redação riscada que o Planalto mantém antes da vigente (CPC
    246, ANVISA 15, Lavagem 6º), e quem procura o artigo pelo número acharia o texto revogado;
  - entidade com nome (&ccedil;, &atilde;, &Eacute;…) virava espaço: o DL 200, a única página que as
    usa, saía com 6.407 letras a menos ("A delega o de compet ncia") e perdia o art. 12. Vale agora a
    tabela Latin-1 inteira;
  - citação de outra norma: o artigo que altera outra lei reproduz o texto dela entre aspas ("“" no
    começo de uma linha até "”" no fim de outra), e o "Art." lá dentro é da lei citada. A Lei 14.133
    passava a ter os arts. 337-E a 337-P do Código Penal como seus (o treino perguntava "O Art. 337-L da
    Lei 14.133 comporta exceção?"), e o CPC tinha "Art. 48/50/83" de outras leis e o art. 275 do Código
    Eleitoral. O `<blockquote>` não serve de sinal: o Planalto o usa também em artigos da própria lei
    (CC art. 853-A, CP arts. 234-A a 234-C). Caso S29k;
  - teto do acervo: 4.000 caracteres por artigo só não mordia porque as remissões partiam os artigos
    longos em pedaços, cada um com o seu teto. Com elas devolvidas, o CF art. 37 (16.287 caracteres)
    virava uma entrada cortada, e o sentinela, que só compara o começo de um artigo cortado, deixava de
    ver mudança na cauda de 14 artigos longos (CF 37 e 146, CPP 28-A, LIA 17). O teto passa a 32.000
    (`TETO_ACERVO`, a mesma constante no sentinela): só 3 entradas das 49 leis passam dele, e o acervo
    cresce 0,66 MiB (o cache offline segue dentro do orçamento).
- **Lei seca regravada** com `scripts/build-leis-seca.mjs` e o leitor corrigido: as 14 normas do
  núcleo (7.156 → 7.235 artigos) e as 35 das outras áreas, com a mesma lista, ordem e etiquetas
  (3.776 → 3.583: saem as remissões e os artigos de outras leis citados). Os rótulos que somem em
  relação à `main` são todos conferidos: o toco "(Revogado…)" do CLT art. 26 (só passava no piso
  porque o art. 27 vinha grudado nele), o LOAS art. 28-A (só "(Revogado…)", e carregava dentro dele o
  art. 29) e as cópias citadas de artigos de outras leis (CPC 48/50/83/275, Lei 14.133 337-P, ORCRIM
  288, Tráfico de Pessoas, Primeira Infância, Estatuto PcD 1.783-A, as partes vetadas promulgadas da
  Lei de Abuso de Autoridade) — o artigo próprio de mesmo número, quando há, continua.
  Conferido por rótulo e ocorrência contra a versão da `main`. Texto novo da lei: CTN (LC 236/2026),
  CPC (Lei 15.484/2026), CF (arts. 7º e 198 e art. 67 do ADCT), CP (arts. 129 e 157), CDC (art. 57,
  MP 1.393/2026), CLT (arts. 790 e 790-B), ECA (art. 4º), Lei 14.133 (art. 77), CTB, LRF (LC
  239/2026), ANVISA (Lei 15.524/2026) e IBS/CBS (LC 235/2026). O sentinela do Planalto, rodado em
  seguida, leu as 14 normas sem diferença entre a página e o acervo.
- **O build da lei seca não grava mais arquivo incompleto.** Ele seguia sem a lei que falhava e
  gravava o resto: numa queda de rede desta rodada, o `leis-seca-areas.js` saiu com 34 das 35 leis
  (sem o DL 200). Agora cada lei tem três tentativas, de até 60 s cada; se alguma ainda falhar, nada
  é gravado e o build sai com erro. E lei que volta com menos de 80% dos artigos do arquivo atual (a
  régua do `parseSuspeito` do sentinela) é tratada como leitura parcial: o build para, salvo
  `"--aceitar-queda=SIGLA"` (casos S29j e S29l; o laço do build mora em `lerLeisSeca`, na lib, para
  poder ser testado sem rede). O piso absoluto de artigos por lei desce de 20 para 10: a Lei 13.344
  (Tráfico de Pessoas) tem 17 artigos próprios, e só passava dos 20 com os citados de outras leis.
- **Importador do STJ:** o rótulo "Ramo do Direito" é reconhecido sem depender de maiúsculas (o
  Portal de Precedentes do STJ escreve "Ramo do direito"), e mais de um julgado sem ramo na mesma
  edição é falha — sinal de rótulo que mudou de forma —, não uma edição inteira "sem ramo".
- **Repetitivos do STJ voltam a ser lidos.** Em nov/2026 a aba da pesquisa do portal passou de
  "Temas (N)" a "Repetitivos (N)" (e ganhou a aba "Relevância (N)"). A régua procurava "Temas (N)":
  as 31 faixas da varredura saíam "página sem o contador" e a última leitura completa era de
  14/10/2026. O contador aceita os dois rótulos; o da aba de Relevância nunca conta (caso S24c2,
  com o cabeçalho real de 25/11/2026).
- **Leitura ativa não é afetada:** o leitor do LEGIS na web lê a lei pelo `/api/law`, não por
  `leis-seca.js` (conferido em `legis-web.html` em 25/11/2026). `leis-seca.js` alimenta o treino,
  a prova oral e o simulado de lei seca, que sorteiam pelo texto; os ids das questões de lei seca
  valem só dentro do simulado, nada da pessoa fica gravado por eles.
- **Pendente:**
  - os artigos `parcial` da Central (CF arts. 7º e 198, CP arts. 129 e 157, CTN art. 142) continuam
    pedindo conferência na fonte, por desenho: o item nasceu com o artigo acima do teto do acervo;
  - três entradas ainda passam do teto novo (a maior é o IBS/CBS art. 544, com 95.842 caracteres) e
    seguem comparadas só pelo começo.
- **Temas de repercussão geral e repetitivos no acervo do JURIS:** com a leitura de hoje, o sentinela
  aponta, nos temas que o acervo já tem, 36 situações e 39 teses do STF e 71 situações e 25 teses do
  STJ diferentes da fonte oficial; e há 24 teses de RG ("Há repercussão") e 87 teses de repetitivos
  fora do acervo. Nada disso entra sozinho (atualização assistida): fica para um PR próprio, conferido
  item a item na fonte.
- **Consumidores da lei seca e dos informativos**, achados pela revisão independente:
  - o widget do dia ficava, para cada número, com a PRIMEIRA entrada, que é a redação riscada quando o
    Planalto mantém a antiga antes da vigente: o CF art. 37 aparecia sem "eficiência" (antes da EC
    19/1998), e mais 10 artigos com texto revogado. Agora vale a última de entradas seguidas com o mesmo
    número (o mesmo número mais adiante, como no ADCT, não troca o do corpo);
  - o marcador "Tese vinculante" do card semanal procurava "( Tema 1379)" e perdia os repetitivos do STJ
    no formato da 910, "( Tema Repetitivo 1469)". Os marcadores moram agora em
    `scripts/lib/semana-marcadores.mjs`, testáveis sem rodar o build;
  - a Central de novidades registra as edições incorporadas nesta rodada (STF 1236 a 1238, STJ 909 a
    911) já com baixa ("já no JURIS"): o sentinela rodou com `--detectar-desde` apontando o
    `juris-index.js` de antes da incorporação.

