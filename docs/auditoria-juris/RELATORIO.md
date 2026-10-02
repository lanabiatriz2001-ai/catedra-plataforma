# Auditoria jurídica do CátedraJURIS — lote 1

> Registro histórico dos lotes 1 a 16 (15 a 22/09/2026). O estado atual está em
> `FECHAMENTO-2026-09-23.md`: as 98 pendências do placar da seção 83 foram resolvidas em 23/09/2026.

Data da pesquisa: **15/09/2026**. Fontes oficiais consultadas nesta data.
Registro cumulativo. Os `.json` de trabalho e o `inventario.mjs` (39 arquivos, cerca de 73 MB) ficam
fora do repositório, ignorados no `.gitignore`. Em 01/10/2026 a cópia completa estava só em
`docs/auditoria-juris/` do checkout principal (`~/catedra-plataforma-main`), e `~/catedra-auditoria-cache/`
tinha 20 dos 39. Antes de limpar esse checkout (um `git clean -X` os apaga), copie para o cache os que faltam.

## 1. Inventário (completo)

Extraído por `inventario.mjs`, que varre todas as fontes de dados e casa seis padrões
de citação (processo, súmula, súmula vinculante, tema, informativo e afirmação genérica
atribuída a tribunal do tipo "o STJ entende").

| Camada | Ocorrências | Referências únicas |
|---|---|---|
| Acervo JURIS (verbetes STF/STJ) | 14.479 | 14.479 |
| Acervo JURIS (TSE 725 + TJRO 32) | 757 | 757 |
| Editorial — **transcrição** de documento oficial | 2.341 | 1.307 |
| Editorial — **autoral** da plataforma | 274 | 148 |
| **Total** | **17.851** | — |

Camada editorial por tipo (ocorrências): processo 1.588 · tema 439 · súmula 430 ·
afirmação genérica 136 · informativo 15 · súmula vinculante 7.

## 2. Descoberta que muda o escopo

**89,5% das citações da camada editorial não são afirmações da plataforma** — são
transcrição literal de documento oficial de terceiro:

- `oral-conteudo.js` → padrão de resposta publicado pela CEBRASPE (1.079 ocorrências)
- `discursivas-completo.js` → espelho oficial da banca (811)
- `espelhos.js` → quesitos do espelho oficial (451)

Se houver erro jurídico nesses textos, **o erro é da banca, não da plataforma**, e
reescrevê-los adulteraria a transcrição de um documento oficial — o Cátedra deixaria de
poder dizer "é o que a banca escreveu". O tratamento tecnicamente correto é **nota de
conferência anexa**, nunca edição do texto. Isso é uma decisão sua (item 5 do pedido).

A camada onde a auditoria se aplica em sentido pleno é a **autoral** — 274 ocorrências,
148 referências únicas, concentradas em `pecas.js` ("a jurisprudência que costuma cair
ali"), que é texto escrito pela plataforma.

## 3. O que foi efetivamente verificado neste lote

Varredura **integral** do subconjunto súmulas + súmulas vinculantes da camada autoral:
**100 ocorrências / 47 referências únicas**, cada afirmação comparada com o enunciado
oficial e, nos achados, confirmada no portal do tribunal.

- Referências inexistentes ou com número errado: **0**
- Erros de fidelidade de conteúdo: **4** (abaixo)

## 4. Achados

### A1 · ALTA · Súmula 545 do STJ — redação SUPERADA
- **Local:** `pecas.js:367` e `pecas.js:2757`
- **Texto atual:** "Confissão usada na convicção gera a atenuante — Súmula 545 do STJ"
- **Erro:** é a **redação anterior**, revogada. A Terceira Seção revisou a Súmula 545 em
  **10/09/2025** (REsp 2.001.973/RS, Tema repetitivo 1194, Rel. Min. Og Fernandes). A
  redação vigente diz o **oposto** da condicional: a atenuante incide
  *independentemente* de a confissão ter sido usada na formação do convencimento.
  A plataforma ensina hoje o entendimento superado.
- **Redação sugerida:** "Confissão espontânea atenua a pena independentemente de ter
  sido usada na convicção do julgador — Súmula 545 do STJ (revisada em 10/09/2025) e
  Tema repetitivo 1194. Ressalvas da tese: não vale se houve retratação (salvo se a
  confissão serviu à apuração dos fatos), e a atenuação é aplicada em menor proporção,
  sem preponderar sobre agravantes, quando o fato confessado for de menor pena ou
  caracterizar excludente."
- **Fonte:** https://processo.stj.jus.br/repetitivos/temas_repetitivos/pesquisa.jsp?novaConsulta=true&tipo_pesquisa=T&cod_tema_inicial=1194&cod_tema_final=1194 — situação "Trânsito em Julgado" (consulta em 15/09/2026)

### A2 · ALTA · Súmula 694 do STF — atribuição errada
- **Local:** `pecas.js:1827`
- **Texto atual:** "Não cabe contra punição disciplinar militar — Súmula 694 do STF"
- **Erro:** a Súmula 694 não trata de punição disciplinar militar. Seu enunciado é:
  *"Não cabe habeas corpus contra a imposição da pena de exclusão de militar ou de perda
  de patente ou de função pública."* A vedação de HC quanto ao **mérito** da punição
  disciplinar militar vem do **art. 142, §2º, da CF**, não desta súmula.
- **Redação sugerida:** "Não cabe contra exclusão de militar, perda de patente ou de
  função pública — Súmula 694 do STF (quanto ao mérito da punição disciplinar militar,
  a vedação é do art. 142, §2º, da CF)"
- **Fonte:** https://jurisprudencia.stf.jus.br/pages/search/seq-sumula694/false (consulta em 15/09/2026)

### A3 · MÉDIA · Súmula 108 do STJ — a súmula não sustenta a proposição
- **Local:** `pecas.js:1514`
- **Texto atual:** "Cumulável com medida em meio aberto — nunca com internação ou
  semiliberdade (Súmula 108 do STJ e art. 127, parte final)."
- **Erro:** a Súmula 108 diz apenas que aplicar medida socioeducativa é competência
  exclusiva do juiz. Ela nada dispõe sobre **cumulabilidade** da remissão com medida —
  essa regra está no art. 127, parte final, do ECA. A súmula é pertinente a *quem*
  aplica, não a *o que pode ser cumulado*.
- **Redação sugerida:** "Cumulável com medida em meio aberto — nunca com internação ou
  semiliberdade (ECA, art. 127, parte final). A aplicação da medida é competência
  exclusiva do juiz (Súmula 108 do STJ)."
- **Fonte:** enunciado oficial (Terceira Seção, DJ 22/06/1994)

### A4 · BAIXA · Súmula 536 do STJ — generalização além do enunciado
- **Local:** `pecas.js:461`
- **Texto atual:** "Não cabem os institutos da Lei 9.099/95 (Súmula 536 do STJ)"
- **Erro:** a Súmula 536 alcança apenas **suspensão condicional do processo e transação
  penal**. A exclusão integral da Lei 9.099/95 decorre do **art. 41 da Lei 11.340/06** —
  conclusão correta, fundamento trocado.
- **Redação sugerida:** "Não se aplica a Lei 9.099/95 (art. 41 da Lei 11.340/06); quanto
  à suspensão condicional do processo e à transação penal, Súmula 536 do STJ."
- **Fonte:** enunciado oficial (Terceira Seção, DJe 15/06/2015)

### Verificados e **corretos** (dois que eu havia suspeitado e não se confirmaram)
- **Súmula 605 do STJ** — o "até os 21 anos" está no próprio enunciado oficial. Fiel.
- **Súmula 691 do STF** — `pecas.js:1851` já registra a mitigação por flagrante
  ilegalidade. Sem omissão.
- **Súmula 183 do STJ** — `pecas.js` já avisa que está **cancelada** desde 2000. Correto.
- **Súmula 524 do STF** — a plataforma já sinaliza que a premissa do arquivamento mudou
  com a Lei 13.964/2019. Correto.

## 5. Limites de acesso (medidos em 15/09/2026)

| Fonte oficial | Situação | Consequência |
|---|---|---|
| STF — jurisprudência (súmulas, SV, acórdãos, temas RG) | Acessível **pelo navegador**, uma página por vez | Verificável, ~20 s por referência |
| STJ — Temas repetitivos (`processo.stj.jus.br`) | Acessível **automatizável** | Verificável em lote |
| STJ — SCON (súmulas e inteiro teor de acórdãos) | **Bloqueado** por desafio anti-bot (HTTP 403 / challenge) | Não verificável daqui. Não tentei contornar o desafio. |
| STJ — BDJur (biblioteca digital) | Acessível | Rota alternativa possível para súmulas, via PDF oficial (mais lenta) |

O acervo local (`dados/juris-text`) guarda a transcrição oficial e serviu de espelho
para o cruzamento; onde havia achado, confirmei no portal do tribunal.

## 6. Pendências — o que **não** foi verificado

| Bloco | Ocorrências | Situação |
|---|---|---|
| Autoral — súmulas e SV | 120 | **Concluído** |
| Autoral — processos (RE/HC/REsp…) | 94 | Pendente (STF pelo navegador; STJ depende do SCON) |
| Autoral — temas | 54 | Pendente (STJ automatizável; STF pelo navegador) |
| Autoral — afirmações genéricas e informativos | 17 | Pendente |
| Editorial — transcrição de documento oficial | 2.341 | **Aguarda sua decisão** (seção 2) |
| Acervo JURIS — STF | 4.108 | Pendente — verificável, ~23 h de navegador |
| Acervo JURIS — STJ | 10.371 | **Bloqueado** enquanto o SCON recusar acesso |

**A auditoria NÃO está concluída.** Este é o lote 1.

---

# Lote 2 — rota BDJur aberta, acervo de súmulas do STJ conferido

Decisões suas incorporadas: transcrição de banca recebe **nota anexa, texto intacto**;
o STJ passa a ser conferido pela **rota BDJur**.

## 7. A rota que destravou o STJ

O SCON continua bloqueado, mas o BDJur apontou o caminho: a **Revista Eletrônica de
Súmulas do STJ**, publicação oficial do tribunal, servida em host sem bloqueio e com
**um PDF por súmula**.

- Índice: `https://www.stj.jus.br/web/revista/eletronica/publicacao/?aplicacao=revista.sumulas`
- 49 edições varridas; mapa súmula → PDF oficial em `mapa.tsv` (477 PDFs individuais)
- Súmulas 402–616 não têm PDF individual: extraídas dos **volumes completos** das
  edições 38–47
- **Corpus oficial montado: 627 das 665 súmulas** (`oficial-sumulas.json`)

Isso é automatizável e repetível — a auditoria do STJ deixou de depender do SCON.

## 8. Resultado: acervo de súmulas do STJ

676 súmulas no acervo; **627 conferidas caractere a caractere contra o PDF oficial**.

| Resultado | Quantidade |
|---|---|
| Texto idêntico ao oficial | **623** |
| Divergência explicada (ver abaixo) | 3 |
| Quase idêntico (pontuação) | 1 |
| Sem fonte oficial local | 49 |

**Nenhum defeito encontrado no acervo.** As 3 divergências foram investigadas e o
acervo está **certo** nas três:

- **Súmulas 545 e 630** — o acervo traz a redação **revisada em 10/09/2025** (Tema
  repetitivo 1194); a Revista é um retrato de 2022 e traz a anterior. O acervo está
  mais atual que a publicação impressa.
- **Súmula 348** — diferença apenas na nota de histórico anexada pelo acervo.

Isso confirma, por um caminho independente, o achado **A1**: o acervo já sabe da revisão
de 2025 da Súmula 545 — quem ficou parado na redação velha foi o texto autoral de
`pecas.js`. O erro é de redação didática, não de dado.

### Limitação medida desta rota
A Revista de Súmulas é um **retrato da data de publicação** (última edição: 2022). Ela
prova o texto **como publicado**, não a vigência de hoje. A atualidade tem de vir do
portal de repetitivos e das notas de revisão/cancelamento — foi o que fiz nos 3 casos.

## 9. Pendências atualizadas

| Bloco | Ocorrências | Situação |
|---|---|---|
| Autoral — súmulas e SV | 120 | **Concluído** (4 achados) |
| **Acervo STJ — súmulas** | **627 de 676** | **Concluído** (0 defeitos) |
| Acervo STJ — súmulas sem fonte | 49 | Pendente: 11 posteriores à Revista (666–676) e 38 com PDF ilegível/ausente |
| Autoral — processos, temas, afirmações | 165 | Pendente |
| Acervo STJ — acórdãos e teses (não súmulas) | ~9.700 | Pendente — o SCON segue bloqueado; a rota da Revista não cobre acórdão |
| Acervo STF | 4.108 | Pendente — verificável pelo navegador |
| Transcrição de banca | 2.341 | Pendente — conferir e anexar nota, sem tocar no texto |

**A auditoria continua NÃO concluída.**

---

# Lote 3 — camada autoral fechada (temas, processos e afirmações)

## 10. Mais uma rota oficial aberta: o banco de teses do STF

A busca de jurisprudência do STF devolve o mesmo desafio anti-bot para acórdãos e temas.
Mas o portal de repercussão geral expõe o **banco oficial de teses** por POST:

- `https://portal.stf.jus.br/repercussaogeral/retornartesesrepercussaogeral.asp`
  (campo `tipo=com` / `tipo=sem`) → **1.284 temas** com classe, número do processo e
  tese literal (`teses-com.json`, `teses-sem.json`)
- Consulta processual: `https://portal.stf.jus.br/processos/listarProcessos.asp?classe=X&numeroProcesso=N`
  → relator e número do incidente

Com isso, **temas e processos do STF passaram a ser conferíveis em lote**, sem navegador.

## 11. Temas — 25 únicos, 54 ocorrências: **zero erros**

Todos conferidos contra a fonte oficial do tribunal correto (o mesmo número existe nos
dois tribunais com conteúdo diferente — a plataforma rotula o tribunal em todos os casos,
e acertou em todos).

- STJ (10): 905, 1076, 1204, 526, 400, 988, 566, 273, 1257, e o par 701/1055
- STF (14): 999, 1087, 1075, 810, 350, 698, 548, 224, 210, 237, 150, 897, 1068, 1199

Dois pontos que merecem registro **a favor** da plataforma:

- **Temas 701 e 1055 do STJ foram cancelados** pelo Tema 1257 (DJEN de 13/02/2025).
  Cheguei a abrir isso como achado grave — e estava errado: `pecas.js:2353` já nomeia o
  cancelamento com processo, seção, relator e data, e `pecas.js:2376` ainda registra que
  citar o Tema 701 é erro. **Retiro o alarme.**
- **Tema 1199 do STF** — a plataforma reproduz as teses 3 e 4 fielmente e avisa que o
  tema "tem exatamente quatro teses e nenhuma trata de prescrição intercorrente".
  Conferi contra o banco oficial: são quatro, e nenhuma trata disso. Correto.

## 12. Processos — 39 distintos: **35 confirmados, 4 pendentes, zero erros**

| Grupo | Qtd | Resultado |
|---|---|---|
| Processos-líder de tema no STJ | 10 | Confirmados no portal de repetitivos |
| Processos-líder de tema no STF | 12 | Confirmados no banco oficial de teses |
| ADI / ADPF / MS / HC / RE no STF | 11 | Confirmados na consulta processual (classe, número e relator) |
| Outros com fonte oficial | 2 | REsp 1.890.344 (Tema 1098) e REsp 1.071.741/SP — este confirmado como **2ª Turma** no PDF oficial da Súmula 652, exatamente como a plataforma afirma |
| **Pendentes** | **4** | Decisões de turma do STJ — dependem do SCON, bloqueado |

A relatoria que a plataforma **afirma** também confere: ADI 7042 e 7043, Rel. Min.
Alexandre de Moraes; MS 24.073 (Carlos Velloso) e MS 24.584 (Marco Aurélio) existem e são
do Pleno, como descrito.

Pendentes (verificação inconclusiva **por falta de acesso**, não por suspeita):
`HC 598.886/SC` · `AgRg no AgRg no REsp 2.038.919/PR` · `AgInt no REsp 2.029.870/MA` ·
`REsp 1.487.772/SE`.

## 13. Afirmações atribuídas a tribunal sem precedente — 4 únicas

- **3 estão ancoradas** em precedente citado logo ao lado, e os precedentes existem
  (ADI 7042/7043/7156/7236; MS 24.073 e MS 24.584; HC 185.913).
- **1 recomendação (não é erro)** — `pecas.js:2516`: *"O STF admite a concomitância entre
  o regime da Lei 8.429/1992 e o de crime de responsabilidade, salvo para os agentes
  submetidos à Lei 1.079/1950…"*. A afirmação é correta, mas não traz precedente.
  **Sugestão:** acrescentar `(STF, Pet 3.240 AgR, Pleno, 2018)`.

### Correção de classificação minha
`questoes-enam.js` é **transcrição** de prova oficial (FGV/ENFAM), não texto autoral — eu
o havia classificado como autoral no lote 1. Suas 9 citações migram para a camada de
transcrição e seguem a regra da nota anexa. Isso não muda nenhum achado.

## 14. Situação da camada autoral

| Bloco | Únicas | Situação |
|---|---|---|
| Súmulas e SV | 47 | **Concluído** — 4 achados (A1–A4) |
| Temas | 25 | **Concluído** — 0 erros |
| Processos | 39 | **35 conferidos**, 4 inconclusivos por acesso |
| Afirmações genéricas | 4 | **Concluído** — 0 erros, 1 recomendação |

**A camada autoral está conferida, salvo 4 processos de turma do STJ.**
Achados totais: **4 erros** (todos em `pecas.js`, todos de redação didática, nenhum de
dado) e **1 recomendação**. Nada foi alterado na plataforma.

## 15. O que falta para a auditoria ser integral

| Bloco | Ocorrências | Bloqueio |
|---|---|---|
| Autoral — 4 processos de turma do STJ | 8 | SCON |
| Acervo STJ — súmulas sem fonte | 49 | 11 posteriores à Revista; 38 com PDF ilegível |
| Acervo STJ — acórdãos e teses | ~9.700 | SCON — sem rota oficial alternativa até agora |
| Acervo STF — súmulas, SV e acórdãos | 4.108 | Súmulas/SV: viáveis pelo navegador. Acórdãos: busca bloqueada |
| Transcrição de banca | 2.350 | Sem bloqueio — é volume de trabalho, com nota anexa |

---

# Lote 4 — acervo de súmulas e SV do STF conferido (799 de 799)

## 16. A rota do STF

A busca do STF devolve desafio anti-bot a cliente HTTP, mas **a própria página**, depois
de carregada no navegador, consulta sua API normalmente. Usei a API como a página usa:

- `GET /api/search/get/seq-sumulaNNN` — um verbete, com texto, órgão julgador, data de
  julgamento e de publicação, legislação citada, precedentes e observações
- `POST /api/search/search` (Elasticsearch) — a base `sumulas` inteira, 799 registros

Não contornei nenhum desafio: o navegador o resolveu como um visitante comum.
Súmulas vinculantes vivem na mesma base, com `is_vinculante: true` e numeração própria.

## 17. Método: comparação por agregado, sem trafegar 799 textos

Normalizei os dois lados igualmente (sem acento, caixa, pontuação ou espaço), calculei um
hash por verbete e comparei **hashes agregados** — geral e em 16 baldes. Se qualquer
verbete diferisse, o agregado e pelo menos um balde mudariam.

| Campo | Acervo | Oficial | Agregado |
|---|---|---|---|
| Texto do enunciado | 799 | 799 | `cc3db518` = `cc3db518` ✓ |
| Órgão julgador | 799 | 799 | `524bccef` = `524bccef` ✓ |
| Fonte de publicação | 798 | 798 | `2cd9590c` = `2cd9590c` ✓ |

Os 16 baldes bateram um a um. **As 736 súmulas e as 63 súmulas vinculantes do STF no
acervo são idênticas ao texto oficial, e os metadados também.** Zero defeitos.

O único verbete sem fonte de publicação é a **SV 30** — e ela também não tem no STF.

### Limite do método
A normalização ignora acento, caixa, pontuação e espaço. Uma divergência **apenas** de
pontuação ou acentuação não seria detectada. Qualquer diferença de palavra, omissão,
acréscimo ou troca seria.

## 18. Atualidade: 12 verbetes cancelados

O STF marca **12 súmulas/SV como canceladas, revogadas ou superadas**. As 12 notas estão
no acervo, **verbatim** — incluindo a mais recente:

> **Súmula Vinculante 9 — cancelada no julgamento conjunto da PSV 60 e PSV 64 (DJe de 04/11/2025).**

Lista: Súmulas 3, 4, 152, 274, 301, 388, 394, 563, 584, 599, 619 e a SV 9.

Cheguei a esse conjunto por dois caminhos independentes — pelo campo de observação da API
do STF e pelo acervo local — e os dois deram exatamente as mesmas 12.

## 19. Cruzamento: a plataforma cita alguma súmula cancelada como se valesse?

**Não.** Varri todas as 2.615 ocorrências contra as 12 canceladas do STF e as 28 do STJ:

- 6 ocorrências citam súmula cancelada (Súmula 394/STF em transcrição de banca; Súmula
  183/STJ em `pecas.js`)
- **as 6 dizem expressamente que está cancelada**

### Correção de método minha
Meu primeiro detector de cancelamento procurava a palavra "superada" em qualquer lugar do
verbete e acusou a **Súmula 21 do STJ** — mas "fica superada a alegação" é parte do
*próprio enunciado*; a súmula está em vigor. Passei a exigir marcador institucional
("foi cancelada", "deliberou pelo CANCELAMENTO"…), e aí o número do STF caiu de 18 para
12, batendo com o oficial. **Súmula 21 do STJ não é achado.**

## 20. Situação geral do acervo

| Bloco | Conferidos | Defeitos |
|---|---|---|
| STF — súmulas e SV | **799 de 799** | **0** |
| STJ — súmulas | 627 de 676 | 0 |
| **Subtotal súmulas** | **1.426 de 1.475** | **0** |
| STF — acórdãos e decisões | 0 de ~3.300 | — |
| STJ — acórdãos e teses | 0 de ~9.700 | — |

Os 4 achados da auditoria seguem sendo **apenas os do lote 1**, todos em `pecas.js` e
todos de redação didática. **O acervo não tem um único defeito de dado até aqui.**

## 21. O que falta

| Bloco | Ocorrências | Situação |
|---|---|---|
| Acervo STF — acórdãos/decisões | ~3.300 | Viável pela mesma rota da API, em lote |
| Acervo STJ — acórdãos e teses | ~9.700 | SCON bloqueado; sem rota alternativa |
| Acervo STJ — 49 súmulas | 49 | 11 posteriores à Revista; 38 com PDF ilegível |
| Autoral — 4 processos de turma do STJ | 8 | SCON |
| Transcrição de banca | 2.350 | Sem bloqueio — volume, com nota anexa |

**A auditoria segue NÃO concluída.**

---

# Lote 5 — bloco "acórdãos" do STF: **5 erros de numeração de tema**

## 22. Correção de escopo

O bloco não é de acórdãos. Os 3.309 verbetes do STF que não são súmula se dividem em
oito blocos heterogêneos:

| Bloco | Verbetes | Natureza |
|---|---|---|
| `informativo_stf` | 1.606 | Informativos |
| `repercussao_geral` | 883 | Temas de RG |
| `controle_const` | 425 | Controle de constitucionalidade |
| `sel_tjgo` / `sel_tjrj` / `sel_tjpr` | 364 | Seleção curada por concurso |
| `repetitivo` | 19 | Temas repetitivos |
| `precedentes_obrig` | 12 | Precedentes obrigatórios |

Conferi **os 914 com número de tema**, contra o banco oficial de teses do STF e o portal
de repetitivos do STJ. Dos 914, 851 tinham tese oficial para comparar.

## 23. Resultado

| | Qtd |
|---|---|
| Casam com o número de tema declarado | **812** |
| **Número de tema ERRADO** | **5** |
| Tema do **STJ** guardado sob tribunal "STF" | 8 |
| Inconclusivos (paráfrase distante demais para decidir por sobreposição) | 26 |
| Sem tese oficial (mérito pendente no STF) | 16 |

### Os 5 erros confirmados
Em cada um, o texto do acervo é, **palavra por palavra, a tese de outro tema**. Isso é
grave num material de estudo: a pessoa decora o número errado, e quem procura o número
certo recebe o precedente errado.

| # | Registro | Declara | É, na verdade | O que o tema declarado é de fato |
|---|---|---|---|---|
| B1 | `COORD-RG-791` | Tema 791 | **Tema 761** (RE 670.422) — transgênero, alteração de prenome | Taxa de Coleta de Lixo do PAR (RE 855.026) |
| B2 | `PRECOBR-002` | "Tema 06" | **Tema 500** (RE 657.718) — medicamento experimental / sem registro na ANVISA | Medicamento fora das listas do SUS (RE 566.471) |
| B3 | `repgeral-repercussao_geral-STF-380` | Tema 380 | **Tema 951** (RE 1.023.750) — CLT→RJU, diferenças do PCCS | Art. 17 do ADCT e coisa julgada (RE 600.658) |
| B4 | `repgeral-repercussao_geral-STF-82` | Tema 82 | **Tema 499** (RE 612.043) — eficácia subjetiva da coisa julgada em ação de associação | Autorização expressa para associação atuar em juízo (RE 573.232) |
| B5 | `repgeral-repercussao_geral-STF-1090` | Tema 1090 | **Tema 279** — procuradores **federais**, férias de 30 dias | Procuradores da **Fazenda Nacional**, férias de 60 dias |

**Correção sugerida:** trocar o número do tema (e o título "Tema N (RG)") pelo correto em
cada registro, mantendo o texto — o texto está certo; o rótulo é que está errado.

**B2 merece destaque:** os dois temas são de direito à saúde e fornecimento de
medicamento. O erro é confundível justamente por isso, e o registro está no bloco que a
plataforma apresenta como **precedentes obrigatórios** — onde **2 de 12 (17%)** estão com
número trocado.

### Tema do STJ sob o rótulo "STF"
8 dos 12 registros numerados da categoria `repetitivo` trazem **tese literal do STJ** mas
estão gravados com tribunal `STF`: Temas 18, 185 (2×), 220, 292, 340, 581, 596.
Conferi cada um no portal de repetitivos do STJ — o texto confere com o STJ, não com o
STF. O defeito é o **rótulo do tribunal**, não o conteúdo.
(Dos outros 4: Temas 676 e 1127 são mesmo do STF; 536 e 449 ficaram inconclusivos.)

## 24. Rastreabilidade — achado estrutural

| Bloco | Sem link de fonte | Dizer o Direito | Fonte oficial |
|---|---|---|---|
| `informativo_stf` (1.606) | 1.499 | — | 107 |
| `repercussao_geral` (883) | 57 | 653 | 173 |
| `controle_const` (425) | 425 | — | — |
| `sel_tj*` (364) | 364 | — | — |
| `precedentes_obrig` (12) | 12 | — | — |
| **Total (3.309)** | **2.357 (71%)** | **664 (20%)** | **278 (8%)** |

**71% dos verbetes não trazem link de fonte** e 20% apontam para um site de comentário
(Dizer o Direito), não para o tribunal. Não é erro de conteúdo — é impossibilidade de
conferência pelo próprio app. Foi exatamente nos blocos sem link oficial que apareceram
os 5 erros de numeração.

**Sugestão:** gravar no verbete o link oficial do tema
(`portal.stf.jus.br/jurisprudenciaRepercussao/…`), que o banco oficial de teses já
fornece por número — dá para preencher em lote, por script.

## 25. Correções minhas neste lote

Minha métrica de sobreposição produziu falsos alarmes; **retiro seis**, todos corretos no
acervo: `STF-809` (regimes sucessórios, art. 1.790 CC), `STF-471` (MP e DPVAT),
`STF-166` (contribuição do art. 22, IV), `PRECOBR-013` (solidariedade dos entes na
saúde), `STF-1367` (modulação da ADC 49) e `STF-881-3` (CSLL e coisa julgada).

Também **retiro meu enquadramento inicial** dos blocos `sel_tjgo/tjrj/tjpr`: cheguei a
tratá-los como julgados de tribunal estadual rotulados como STF. Não são — são seleções
curadas para os concursos desses tribunais, com material do próprio STF/STJ/TSE. Eu os
classifiquei antes de olhar o conteúdo.

## 26. Situação do acervo

| Bloco | Conferidos | Defeitos |
|---|---|---|
| STF — súmulas e SV | 799 / 799 | 0 |
| STJ — súmulas | 627 / 676 | 0 |
| **STF — temas (RG, repetitivo, prec. obrig.)** | **851 / 914** | **5 numeração + 8 tribunal** |
| STF — informativos, controle const., seleções | 0 / 2.395 | — |
| STJ — acórdãos e teses | 0 / ~9.700 | — |

Achados acumulados: **4 em `pecas.js`** (redação didática) + **13 no acervo** (rótulo:
5 de número de tema, 8 de tribunal). Nada foi alterado na plataforma.

**A auditoria segue NÃO concluída.**

---

# Lote 6 — correção aplicada: PR #93

PR #93 · branch `juris-rotulos-tema`

## 27. O que entrou

12 correções de rótulo em `juris-index.js`, **sem tocar em nenhum texto**:

- **4 números de tema** — B1 (791→761), B2 (Tema 06→500), B3 (380→951), B4 (82→499)
- **8 tribunais** — Temas 18, 185 (2 verbetes), 220, 292, 340, 581 e 596 passam de `STF`
  para `STJ`

Cada vínculo processo↔tema foi lido na consulta processual do STF (campo "Rep. Geral
Tema"): RE 670.422=761, RE 657.718=500, RE 1.023.750=951, RE 612.043=499 — e também os
quatro temas antigos, para provar que o rótulo estava mesmo trocado: RE 855.026=791,
RE 566.471=6, RE 600.658=380, RE 573.232=82.

### O id não mudou — e isso foi decisão, não descuido
`catedra:jurisEstudo` guarda **favorito e status de estudo por id**. Trocar o id apagaria
o que a pessoa já marcou. Os ids seguem com o número antigo: são chave opaca, não
aparecem na tela.

## 28. Teste

Bloco novo em `tests/run.mjs`, 10 casos: os 12 verbetes um a um, a exigência de que o
número antigo não volte, a garantia de que os ids não mudaram, e uma guarda geral — **todo**
verbete de tema tem de ter título coerente com o número gravado.

Provei que o teste falha sem a correção: **6 asserções quebram** no dado anterior.

- `npm test` (Chromium): **2.065 ✓, 0 ✗**
- `npm run test:webkit`: **315 ✓, 0 ✗**
- CI do PR: `testes` ✓ · `Testes WebKit (Safari)` ✓ ·
  Vercel bloqueado (commit *unverified* feito no Mac — o comportamento descrito no
  CLAUDE.md; o merge pelo GitHub publica normal)

## 29. Instalado nos dois

Conferi o dado **dentro do bundle**, não só no repositório:

- **Mac** — `Cátedra.app` assinada para distribuição, instalada em `/Applications` com
  `ditto --norsrc --noextattr --noacl`; `codesign --verify --deep --strict` limpo.
  Em `/Applications`: `COORD-RG-791 = Tema 761 (RG)`, repetitivos sob STJ **8/8**.
- **iPad de [dado pessoal removido]** (UDID [dado pessoal removido]) — instalado por `devicectl`,
  bundle `com.catedra.ipad`. No bundle: `Tema 761 (RG)`, `Tema 500 (RG — STF)`, **8/8**.

O worktree novo não tinha `ios/embedded.mobileprovision` (arquivo não rastreado) — copiei
do checkout principal antes de assinar, senão o build sairia sem perfil.

## 30. Fora do PR, de propósito

- **`repgeral-repercussao_geral-STF-1090`** — o resumo descreve o Tema 1090 e o texto
  descreve o Tema 279. Não dá para dizer qual está errado, então não mexi. **Retiro o B5
  do lote 5**: é inconclusivo, não confirmado.
- **`…STF-82` guarda a data 14/05/2014**, do tema antigo. Não consegui extrair com
  segurança a data de mérito do RE 612.043 e preferi não inventar.
- **`incidencia.js` / `.json` / `-verbetes.json` estão velhos na `main`** (gerados em
  19/08/2026; regerar hoje muda 10.592→10.703 citações por causa dos informativos de
  setembro). Nada a ver com este PR — revertido daqui, merece PR próprio.

## 31. Placar da auditoria

| | |
|---|---|
| Achados em `pecas.js` (redação didática) | 4 — **ainda não corrigidos** |
| Achados de rótulo no acervo | 13 → **12 corrigidos no PR #93**, 1 retirado |
| Súmulas conferidas (STF 799 + STJ 627) | 1.426 — **zero defeitos** |
| Temas e processos autorais conferidos | 25 + 35 — zero erros |

**A auditoria segue NÃO concluída**: faltam os informativos do STF (1.606), controle de
constitucionalidade (425), seleções (364), ~9.700 acórdãos do STJ, 49 súmulas do STJ,
4 processos de turma e as 2.350 citações transcritas de banca.

---

# Lote 7 — achados A1–A4 corrigidos: PR #96

PR #96 · branch `pecas-sumulas-auditoria`

## 32. O que entrou

Os quatro achados do lote 1, todos em `pecas.js`. Nenhum era invenção: eram **rótulo velho**
ou **súmula chamada para sustentar proposição que ela não sustenta**.

| # | Estava | Passou a ser | Fundamento |
|---|---|---|---|
| **A1** | "Confissão usada na convicção gera a atenuante — Súmula 545 do STJ" | "Confissão atenua ainda que não usada na convicção — Súmula 545 do STJ (revisada em 10/09/2025, Tema 1194)" + a ressalva da retratação | REsp 2.001.973/RS, Tema repetitivo 1194, trânsito em julgado |
| **A2** | "Não cabe contra punição disciplinar militar — Súmula 694 do STF" | a súmula pelo que enuncia (exclusão de militar, perda de patente ou função) + linha própria para a punição disciplinar | Súmula 694 do STF; CF, art. 142, § 2º |
| **A3** | cumulabilidade da remissão atribuída à Súmula 108 do STJ | cumulabilidade pelo ECA, art. 127, parte final; a súmula fica na competência exclusiva do juiz | ECA, art. 127; Súmula 108 do STJ |
| **A4** | "Não cabem os institutos da Lei 9.099/95 (Súmula 536 do STJ)" | exclusão pelo art. 41 da Lei 11.340/06, com a Súmula 536 no seu alcance real | Lei 11.340/06, art. 41; Súmula 536 do STJ |

**A1 aparecia em dois lugares** — *Sentença penal — treino guiado* e *Alegações finais da
defesa*. Nos dois o material ensinava a regra superada.

### Uma linha que é acréscimo, não conserto
Em A1 entrou também `Confissão com retratação não atenua, salvo se serviu à apuração dos
fatos — Tema 1194 do STJ`. A tese **não é incondicional**, e trocar uma generalização velha
por uma generalização nova repetiria o defeito que esta auditoria procura. Está sinalizado
no PR: se a dona preferir o roteiro mais enxuto, é uma linha a cortar.

## 33. Teste

Bloco novo em `tests/run.mjs`, **14 casos**: exige a redação vigente onde ela tem de estar e
**barra a volta de cada texto antigo em qualquer peça** — a busca varre o roteiro inteiro, não
só onde o defeito estava. No texto anterior, **9 asserções quebram**.

O bloco foi inserido em região diferente da do PR #93, de propósito, para os dois não
conflitarem no merge.

- `npm test` (Chromium): **2.093 ✓, 0 ✗**
- `npm run test:webkit`: **315 ✓, 0 ✗**

## 34. Instalado nos dois

Conferido **dentro do bundle**, não só no repositório:

- **Mac** — `/Applications/Cátedra.app`, `codesign --verify --deep --strict` conferido.
  Redação revogada da 545 ausente, vigente presente.
- **iPad de [dado pessoal removido]** — instalado por `devicectl`. No bundle, os quatro consertos
  presentes.

## 35. Placar da auditoria

| | |
|---|---|
| Achados em `pecas.js` | 4 → **4 corrigidos (PR #96)** |
| Achados de rótulo no acervo | 13 → **12 corrigidos (PR #93)**, 1 retirado por inconclusivo |
| Súmulas conferidas (STF 799 + STJ 627) | 1.426 — zero defeitos |
| Temas e processos autorais | 25 + 35 — zero erros |

**Todos os achados confirmados da auditoria estão corrigidos.** Os dois PRs aguardam merge.

**A auditoria em si segue NÃO concluída**: faltam os informativos do STF (1.606), controle de
constitucionalidade (425), seleções por concurso (364), ~9.700 acórdãos do STJ, 49 súmulas do
STJ, 4 processos de turma do STJ e as 2.350 citações transcritas de banca.

---

# Lote 8 — informativos do STF: 17 defeitos de rótulo em 1.606 verbetes

## 36. Rota oficial

O projeto já tinha o caminho, em `scripts/atualizar-informativos.py`:
`https://www.stf.jus.br/arquivo/informativo/documento/informativo{N}.htm` — sem bloqueio.
Baixei as **267 edições** citadas pelo acervo (677 a 1224).

Também usei a consulta processual do STF para os verbetes que trazem processo no título.

## 37. O bloco

| | |
|---|---|
| Verbetes | 1.606 |
| Com "Info N · STF" no título | 1.500 (267 edições distintas) |
| Com processo no título | 104 (101 processos únicos) |
| Outro formato | 2 |

## 38. Método, e a calibração que o sustenta

Nenhum verbete é cópia do informativo — todos são paráfrase didática. Então não dá para
comparar texto com texto. Usei três sinais, e **calibrei cada um em verbetes sabidamente
corretos** (aqueles cujo processo citado consta da edição declarada):

| Sinal | Calibração (verbetes sabidamente certos) |
|---|---|
| Contenção de palavras distintivas na edição declarada | mínimo 0,33 · p10 0,50 · **mediana 1,00** |
| Desvio entre a data do verbete e o período da edição | mediana 8 dias · p90 16 · **máximo 63** |

A data do verbete é a do **julgamento**, e o informativo sai depois — por isso desvio
pequeno é normal e *não* é defeito. Só tratei como suspeito o que fica muito fora dessas
faixas. Duas tentativas anteriores minhas foram descartadas por viés: comparar por
contenção bruta elege sempre a edição maior (a 1003, de 286 KB, vencia quase tudo).

## 39. Achados

### 39.1 · Seis verbetes na edição errada (confirmados por termo específico)

Em cada um, o assunto está **ausente** da edição declarada e **presente** na indicada.

| Verbete | Declara | É | Assunto | Contagem do termo (declarada → correta) |
|---|---|---|---|---|
| `INF2021-0029` | 1037 | **1012** | leitos de UTI para Covid-19 | "leitos": 1 → 7 |
| `INF2022-0273` | 1055 | **1053** | assistência médico-hospitalar e operadoras | 0 → 2 |
| `INF2023-0050` | 1082 | **1081** | teto da RPV por estados e municípios | "pequeno valor/RPV": 0 → 14 |
| `INF2023-0082` | 1082 | **1081** | imunidades dos deputados estaduais (ADI 5.824) | "deputados estaduais": 0 → 5 |
| `INF2023-0766` | 1123 | **1113** | transporte público gratuito em dia de eleição | 0 → 4 |
| `INF2020-0055` | 994 | **981** | antenas de telefonia e limites de radiação | 0 → 1 |

### 39.2 · Sete verbetes com conteúdo do STJ sob o rótulo do STF

Estão no bloco `informativo_stf`, com título "Info N · **STF**", mas o conteúdo é do STJ —
somem do filtro por tribunal e apontam para uma edição do STF que não trata daquilo.

| Verbete | Título | Conteúdo real |
|---|---|---|
| `INF2021-0401` | Info 690 · STF | **Informativo 690 do STJ** (29/03/2021) — DPVAT, impenhorabilidade, art. 833, VI, do CPC. O Info 690 do STF é de 2012. |
| `INF2021-0783` | Info 1006 · STF | **Súmula 646 do STJ** — FGTS e verbas trabalhistas |
| `INF2020-0239` | Info 969 · STF | superação da **Súmula 119 do STJ** |
| `INF2020-0636` | Info 981 · STF | **Súmula 415 do STJ** |
| `INF2020-0800` | Info 978 · STF | **Súmula 391 do STJ** |
| `INF2021-0755` | Info 1017 · STF | **Súmula 649 do STJ** |
| `INF2021-0375` | Info 1003 · STF | art. 915, § 2º, do CPC — prestação de contas |

### 39.3 · Quatro datas erradas (o número da edição está certo)

| Verbete | Edição (período oficial) | Data gravada | Desvio |
|---|---|---|---|
| `INF2022-0860` | 1042 (11/02/2022) | 17/12/2012 | −3.343 d |
| `INF2026-STF-1205-02` | 1205 (25/02/2026) | 13/02/**2025** | −377 d |
| `INF2026-STF-1204-01` | 1204 (13/02/2026) | 06/02/**2025** | −372 d |
| `INF2025-0433` | 1168 (17/03/2025) | 11/03/**2024** | −371 d |

Os três últimos erram **exatamente em um ano** — cheiro de ano digitado errado. Confirmei
que o assunto de cada um está na edição declarada, então aqui o número está certo e só a
data precisa de conserto.

### 39.4 · Processos citados no título: 98 de 100 confirmados

Conferi cada um na consulta processual do STF e **validei que a página devolvida nomeia o
processo consultado** — sem isso, uma página genérica passaria por confirmação.

`Rcl 32.579` e `Pet 9.189` ficaram **inconclusivos por limitação da consulta**: o portal
devolve para os dois a mesma página, com uma relatora aposentada em 2011. Não é erro do
acervo — é o portal não respondendo direito. Não os conto como defeito.

## 40. Suspeitos que não fecho

- **3 de alta suspeita, sem edição correta determinada** — `INF2020-0066` (assunto ausente
  do Info 977 e data impossível: 10/08/2006), `INF2025-0059` (Info 1201; o RE 1.054.110
  aparece nas edições 1198 e 1220) e `INF2022-0294` (Info 1061; a ADI 7.104 aparece na 1060
  e na 1062).
- **18 verbetes** com contenção abaixo de 0,15 na edição declarada — muito fora da
  calibração — mas cuja alternativa não teve margem suficiente para eu afirmar qual é.
  Lista em `inf-baixa.json`.

**Limite honesto do método:** baixei só as 267 edições que o acervo cita. Se um verbete
pertence a uma edição fora dessas, a "melhor edição" que meu detector aponta não significa
nada. Foi o que aconteceu no `INF2020-0066`: o detector sugeriu a 1089, fui conferir e o
casamento era coincidência. Por isso só afirmo os seis do item 39.1, cada um checado por
termo específico nas duas edições.

## 41. Uma anomalia na própria fonte oficial

O arquivo `informativo1017.htm` do STF traz no cabeçalho
*"Brasília, 8 a 12 de novembro de outubro de 2004 Nº 369"* — resíduo de template no
documento do tribunal. Não afeta o Cátedra; fica registrado porque atrapalha qualquer
coleta automática e explica por que 15 das 267 edições não tiveram período extraível.

## 42. Placar

| Bloco | Conferidos | Defeitos |
|---|---|---|
| STF — súmulas e SV | 799 / 799 | 0 |
| STJ — súmulas | 627 / 676 | 0 |
| STF — temas (RG, repetitivo, prec. obrig.) | 851 / 914 | 13 (corrigidos, PR #93) |
| **STF — informativos** | **1.600 / 1.606** | **17 confirmados + 21 suspeitos** |
| STF — controle const. e seleções | 0 / 789 | — |
| STJ — acórdãos e teses | 0 / ~9.700 | — |

**A auditoria segue NÃO concluída.** Os 17 defeitos deste lote **ainda não foram
corrigidos** — aguardam decisão.

---

# Lote 9 — informativos: 9 corrigidos no PR #99, 2 retirados, 6 aguardando decisão

PR #99 · branch `inf-rotulos-stf`
**Empilhado sobre o PR #93**, não sobre a `main`: os dois editam `juris-index.js`, que é um
arquivo de uma linha só, e bases separadas conflitariam. Mergeie o #93 primeiro.

## 43. O que entrou (9)

- **6 verbetes na edição errada** — 1037→1012, 1055→1053, 1082→1081 (dois), 1123→1113,
  994→981. Cada um conferido por termo específico nas duas edições.
- **1 verbete do STJ sob rótulo do STF** — `INF2021-0401` passa a STJ, Informativo 690
  (DPVAT, impenhorabilidade, art. 833, VI, do CPC), conferido na fonte do STJ.
- **2 datas** com o valor tirado da própria edição oficial: 17/12/2012→**17/12/2021**
  (Info 1042) e 11/03/2024→**11/03/2025** (Info 1168).

Teste: 11 casos, com guarda geral exigindo título `Info N · TRIBUNAL` coerente com os
campos. No dado anterior, **10 asserções quebram**.
`npm test` 2.076 ✓ · `npm run test:webkit` 315 ✓ · instalado e conferido no bundle do Mac
e do iPad.

## 44. Dois que eu RETIRO — o erro é da fonte oficial

Eu havia acusado `INF2026-STF-1205-02` e `INF2026-STF-1204-01` de ano errado na data.
Ao conferir, o próprio informativo do STF diz:

> *"julgamento virtual finalizado em **13.02.2025 (sexta-feira)**"* (Info 1205)
> *"julgamento virtual finalizado em **06.02.2025 (sexta-feira)**"* (Info 1204)

Mas **13/02/2025 e 06/02/2025 caíram numa quinta-feira**; as sextas correspondentes são
13/02/**2026** e 06/02/**2026**, que é quando as edições saíram. O erro de ano está no
documento do tribunal, e o Cátedra copiou fielmente. **Corrigir aqui afastaria a
plataforma da fonte.** Somado à anomalia do `informativo1017.htm` (item 41), são duas
falhas encontradas na própria fonte oficial durante esta auditoria.

## 45. Seis que eu não corrijo por não saber o valor certo

Verbetes com conteúdo do **STJ** gravados como STF: `INF2020-0239`, `INF2020-0636`,
`INF2020-0800`, `INF2021-0375`, `INF2021-0755`, `INF2021-0783` — Súmulas 119, 391, 415,
646 e 649 do STJ e o art. 915, § 2º, do CPC.

Provo que o tribunal está errado. Mas **o número gravado é de informativo do STF**, e
informativo do STJ com esse número não existe: a numeração do STJ estava em 690 em 2021 e
em 850 em maio/2025, enquanto os verbetes declaram 969, 978, 981, 1003, 1006 e 1017.
Procurei a edição certa do STJ para cada súmula nas 57 edições de 2020–2021 e não localizei.

Corrigir exige decidir **o que o registro deve dizer** — trocar só o tribunal deixaria
"Info 1006 · STF" sob a bandeira do STJ, o que é pior do que está. É decisão sua sobre o
modelo do dado, e não inventei substituto.

## 46. Placar

| | |
|---|---|
| Achados corrigidos | 4 (`pecas.js`, PR #96) + 12 (temas, PR #93) + 9 (informativos, PR #99) = **25** |
| Achados retirados por reverificação | 3 (Tema 1090; duas datas de 2026) |
| Aguardando sua decisão | 6 (STJ sob rótulo STF) |
| Suspeitos não fechados | 21 |
| Falhas encontradas na fonte oficial | 2 |

**A auditoria segue NÃO concluída**: faltam controle de constitucionalidade (425) e
seleções por concurso (364) do STF, ~9.700 acórdãos do STJ, 49 súmulas do STJ, 4 processos
de turma e as 2.350 citações transcritas de banca.

---

# Lote 10 — camada de transcrição: as referências conferem

Enquanto a varredura dos 627 verbetes do STF corria, cruzei a camada de **transcrição de
banca** (2.341 ocorrências, 1.307 referências únicas) contra os corpora oficiais já em disco.
Regra da dona para este bloco: **nota anexa, texto intacto** — erro aqui é da banca, não da
plataforma.

## 47. Resultado

| Tipo | Conferidas | Não localizadas |
|---|---|---|
| Súmulas com tribunal indicado | **75** | **0** |
| Temas de repercussão geral | **90** | 5 → todos explicados abaixo |

**Nenhuma súmula fantasma.** Toda súmula que um espelho de banca cita existe, com o número e
o tribunal que ele diz.

## 48. Os cinco temas "ausentes", um a um

- **`Tema 0`** — falso positivo do meu extrator. O texto era *"a respeito do tema 0,00 a
  30,00"*: a escala de pontuação do padrão de resposta, não uma citação. **Não é referência.**
- **`Tema 0823`** — é o **Tema 823 do STF** (RE 883.642, legitimidade extraordinária ampla dos
  sindicatos), escrito com zero à esquerda. O contexto do espelho — *"execuções de sentença,
  independentemente de autorização dos substituídos"* — bate com a tese. **Correto.**
- **`Tema 1000`** e **`Tema 1255`** — não estão no banco do STF porque são **do STJ**, e lá
  existem: 1000 (exibição de documento) e 1255. **Corretos.**
- **`Tema 843`** — citado como *"STF Tema 843 de repercussão geral"* e **sem tese fixada** no
  banco oficial do STF.

Sobre o 843, o limite tem de ficar claro: o banco do STF traz temas **com tese fixada**. Não
constar ali significa *sem tese fixada* — **não** significa que o tema não exista (pode ter
repercussão geral reconhecida e mérito pendente). Registro como **inconclusivo**, não como
erro, e como candidato a nota anexa.

## 49. O que este cruzamento NÃO prova

Ele confere que a **referência existe** e está no tribunal certo. Não confere se o espelho
**descreve corretamente** o que aquele precedente decidiu — isso é leitura caso a caso das
2.341 ocorrências, e segue pendente.

---

# Lote 11 — controle de constitucionalidade e seleções: 101 defeitos de conteúdo

**E duas correções que devo sobre lotes anteriores.** Começo por elas.

## 50. CORREÇÃO: os PRs #93 e #99 não chegam ao CátedraJURIS nativo

Eu afirmei que as correções dos PRs #93 e #99 estavam "instaladas e verificadas dentro do
bundle" no Mac e no iPad. **Eu conferi a cópia errada.** Olhei
`Contents/Resources/web/juris-index.js` — a cópia **web** embutida no app. A aba **nativa**
do CátedraJURIS (SwiftUI) lê outro arquivo:

- `Contents/Resources/corpus.json` — 22,9 MB, **14.605 registros**
- vem de **outra pasta**: `~/App Jurisprudências/VadeMecumJuris/Sources/VadeMecum/Resources/`
- copiada no build por `mac/build-app.sh:168-171` (e `ios/build-ipad.sh:280`)

Conferido agora em `/Applications/Cátedra.app`: `COORD-RG-791` continua **"Tema 791 (RG)"**
no nativo. **Nenhuma das 25 correções dos três PRs chegou ao JURIS nativo.**

Agravante: **`VadeMecumJuris` não é repositório git.** É pasta comum — sem histórico, sem PR,
sem desfazer. É de lá, pelos `scripts/parse_*.py`, que nasce o acervo nativo. As duas cópias
já divergiram: **14.605 registros no nativo contra 15.236 na web.**

Isso não se conserta em silêncio: aplicar 25 edições num arquivo de 22,9 MB fora do git é
decisão sua (ver seção 55).

## 51. CORREÇÃO: minha métrica aceitou texto cortado

No lote 5 dei `STF-324` e `STF-1277` como corretos; no lote 8 contei `INF2024-0563` como
conferido. Os três terminam **no meio da frase** — *"valores pré-fixados para o"*,
*"art. 109, §2º, da"*, *"fixada no julgamento do"*. A sobreposição de palavras mede se o
conteúdo casa, não se ele está inteiro. **Falha de método minha.**

Varri o acervo inteiro por esse padrão (seção 53).

## 52. A varredura

627 textos distintos (controle de constitucionalidade 425 + seleções 213 distintos de 364),
em 63 lotes, cada um contra fonte oficial. Descoberta dos próprios conferentes: os trechos
`CTRLCONST-*` vêm da **publicação temática oficial do STF "Controle de Constitucionalidade"**
(`portal.stf.jus.br/publicacaotematica/vertema.asp?lei=5235`), que traz a citação de origem
de cada trecho — inclusive quando é **voto** e não acórdão.

Cada achado passou por **dois votos independentes**: um cético (três lentes — fidelidade,
se a fonte sustenta, atualidade) e uma segunda opinião que reconferiu do zero na fonte.

| | |
|---|---|
| Achados brutos | 213 |
| **Derrubados pela etapa adversarial** | **112 (53%)** |
| **Confirmados nos dois votos** | **101** |
| Baixa confiança (fora da verificação) | 6 |
| Conferidos sem problema | 462 |
| Não verificáveis | 55 |

A etapa adversarial fez o que devia: **"citação inexata" caiu de 83 para 28** — os
conferentes marcavam diferença de redação como erro, e os céticos derrubaram o que não muda
o sentido.

### Os 101, por tipo

| Tipo | Qtd |
|---|---|
| atribuição errada | 29 |
| citação inexata que **muda o sentido** | 28 |
| **desatualizado** (superado depois) | 19 |
| data errada | 14 |
| **voto do relator apresentado como tese do colegiado** | 6 |
| generalização sem ressalva | 4 |
| tribunal errado | 1 |

63 no controle de constitucionalidade, 37 nas seleções. Tabela completa, com correção e
fonte de cada um: `lote11-achados.md`.

### Por que estes importam mais que os anteriores

Os lotes 5, 8 e 9 acharam **rótulo** errado — o texto estava certo. Estes 101 são sobre
**o que a pessoa aprende**. Exemplos:

- **`CTRLCONST-0062`** apresenta como postura do STF a **transcendência dos motivos
  determinantes** — que o STF **rejeita** (Rcl 2.475 AgR). É trecho do voto do relator na
  Rcl 4.335, sem o rótulo. Em prova de magistratura, marcar como entendimento do STF é errar.
- **`CTRLCONST-0056`** traz como tese a **mutação constitucional do art. 52, X** — que o
  Plenário **não adotou** (julgou procedente pela SV 26; quatro vencidos; Barroso a rejeitou).
- **`CTRLCONST-0006`** ensina que ADI fica **prejudicada** quando emenda altera o parâmetro.
  O Plenário **superou** isso (ADI 145/CE, 2018, Info 907), e o app mostra a regra antiga
  sem ressalva — enquanto o verbete que a supera (`CTRLCONST-0019`) fica solto, sem ligação.
- **`CTRLCONST-0137`** exige que a entidade de classe reúna os próprios indivíduos da
  categoria — **superado em parte** na ADI 3.153 AgR (associação de associações).

## 53. Texto cortado no meio da frase: 93 verbetes (piso)

Varredura mecânica de todos os 15.236 verbetes por fim de frase interrompido. **93**, em
todos os tribunais e blocos — maiores concentrações: informativos do STF (19), repercussão
geral do STF (15), seleção TJ-GO (29 entre STF e STJ), informativos do STJ (12). Amostra de
12 conferida à mão: **12 cortes genuínos** (*"ADPF 860/SP e"*, *"EDcl nos EDcl nos EDcl no
AgInt no RE nos"*, *"(HC n."*).

**É piso:** o padrão só pega corte depois de preposição, artigo ou vírgula. Texto cortado
depois de um substantivo passa despercebido. Lista em `cortados.json`.

## 54. O crítico de cobertura — o que aceitei e o que refutei

Um agente final procurou o que a varredura **não** seria capaz de ver. Conferi cada ponto:

| Afirmação do crítico | Conferi | Resultado |
|---|---|---|
| O JURIS nativo lê outro arquivo, e os PRs não chegam lá | `corpus.json` em /Applications | **Verdade** — seção 50 |
| Minha métrica aceitou tese cortada | os 5 verbetes | **Verdade** — seções 51 e 53 |
| A rota de informativos devolve 403 hoje | 677, 1003, 1224 | **Falso** — respondem 200 |
| Os 462 "sem problema" nunca tiveram segunda leitura | desenho da varredura | **Verdade** — lacuna aberta |
| Deduplicar por texto fez a 2ª cópia não ser olhada | `CTRLCONST-0416` = texto do 0195 | **Verdade** — lacuna aberta |

## 55. Decisões que são suas

1. **O acervo nativo fora do git.** Três caminhos:
   - (a) aplicar as mesmas correções direto no `corpus.json` — rápido, mas sem desfazer;
   - (b) pôr `VadeMecumJuris` sob git primeiro, e só então aplicar — seguro;
   - (c) fazer o build **gerar** o `corpus.json` a partir do `juris-index.js`, acabando com a
     segunda fonte de verdade — resolve de vez, mas é mudança de arquitetura.
2. **Os 101 achados de conteúdo.** Diferente dos PRs anteriores, a maioria pede **acrescentar
   ressalva** ou **rótulo de voto** — mexe no texto que a pessoa estuda. Quer revisar a tabela
   antes, ou abro o PR?
3. **Os 93 cortes.** O texto completo tem de vir da fonte; não dá para completar de memória.

**A auditoria segue NÃO concluída.** Lacunas abertas: segunda leitura cega dos 462 "sem
problema" (mede quanto a varredura deixou passar); as cópias duplicadas; ~9.700 acórdãos do
STJ; e a leitura caso a caso das 2.341 transcrições de banca.

---

# Lote 12 — as 21 correções chegam ao CátedraJURIS nativo

## 56. VadeMecumJuris sob git

A pasta `~/App Jurisprudências/VadeMecumJuris` — de onde sai o `corpus.json` do JURIS nativo —
passou a ter controle de versão (git **local**, sem remoto). Commit de partida `874b551`: o
acervo exatamente como estava, com os defeitos ainda presentes. Fora do versionamento, mas no
disco: `.build/`, `dist/`, logs, `ocr_pdf`, `*.bak-*`. Varredura de chaves e CPF antes do
commit: nada.

> Correção de 01/10/2026: essa varredura deixou passar uma marca d'água pessoal de PDF de curso
> no campo `observacao` do `SELTJPR-0431` (não reproduzida aqui). Ela está no `corpus.json` desde
> `874b551` e continuava no commit atual do VadeMecumJuris e nos apps instalados no Mac e no iPad
> nessa data. O acervo web versionado não a tem. A limpeza na fonte, com rebuild e reinstalação,
> fica para um PR próprio.

## 57. As correções entram pelo mecanismo do próprio projeto

O `corpus.json` é **gerado** por `scripts/build_corpus.py` a partir de `build/data/*.json`.
Editar o resultado não servia: a próxima geração desfaria tudo. O gerador já tinha um sistema
de **patches** (`build/data/patches_*.json`, `{"match":{"id"}, "set":{...}}`), aplicado depois
da mesclagem em toda geração — usei esse. Arquivo novo:
`build/data/patches_auditoria_2026_09.json`, com motivo e fonte oficial em cada correção.

**Prova de que só as 21 mudaram:**
- antes de qualquer mudança, o gerador reproduzia o `corpus.json` do commit **byte a byte**;
- depois do patch: **exatamente 21 registros** alterados, só nos campos pretendidos; nenhum
  novo, nenhum sumido, 14.605 antes e depois; `indice.json` idêntico; patches 25/25.

Commit `0c4c44e` no VadeMecumJuris.

## 58. Guarda contra regressão silenciosa

O `build_corpus.py` ignora **em silêncio** o patch cujo id não casa (só imprime "24/25").
`scripts/verificar_auditoria.py` falha alto nesse caso e também se o valor errado voltar. No
acervo antigo acusa **0/21 e 44 problemas**; no novo, 21/21.

## 59. Instalado — e desta vez conferido nas DUAS cópias

Build a partir da `main` (`c292a99`, que já contém os PRs #93, #96 e #99), num worktree
limpo. Conferência feita **dentro do bundle, nas duas cópias** — o erro do lote 11 foi
conferir só a web:

| | Nativo (`corpus.json`) | Web (`web/juris-index.js`) |
|---|---|---|
| Mac — `/Applications/Cátedra.app` | **21/21** | **21/21** |
| iPad de [dado pessoal removido] | **21/21** | **21/21** |

Assinatura do Mac: distribuição, Team `2ZT3GWTS9Z`, `--strict` conferido. iPad: perfil
"Catedra iOS Dev".

## 60. Outra sessão sobrescreveu o app — duas vezes

Quatro builds rodavam ao mesmo tempo neste Mac. Ao reconferir `/Applications` depois de
instalar, o app tinha sido **substituído** por um build da branch **`varios-editais`**
(worktree `editais`, 23:37). Resultado dele:

- **nativo 21/21** — a correção, agora no disco do VadeMecumJuris, entra em build de
  **qualquer** sessão. É a primeira vez que a correção sobrevive a um build alheio;
- **web 0/21** — `varios-editais` parte do PR #98 (`8d6e817`), **anterior** aos merges da
  auditoria.

Reinstalei o build verificado (21/21 nas duas). **Enquanto `varios-editais` não incorporar a
`main` atual, todo build dela vai reinstalar o `juris-index.js` antigo.** A branch é de outra
sessão; não mexi nela.

---

# Lote 13 — os 101 achados de conteúdo: PR #109

PR #109 · branch `auditoria-conteudo-stf`
Nativo: VadeMecumJuris commit `ac4a1e7` (`patches_auditoria_2026_09b.json`).

## 61. Descoberta que mudou o desenho: a web perdeu a citação de origem

O nativo guarda, em `precedentes`, a citação de cada trecho — *"[Rcl 4.335, **voto do rel.
min.** Gilmar Mendes, …]"*. A **web não tinha esse campo** nos 95 verbetes (e em todo o
controle de constitucionalidade). Resultado: **18 dos 27** achados de "voto apresentado como
tese" já estavam certos no nativo — o defeito era só da web. O conserto certo foi **restaurar
a citação**, por cópia literal do nativo, e não escrever texto novo.

## 62. Três camadas de verificação

1. Achado confirmado por **dois votos** independentes (lote 11).
2. Cada correção em texto livre virou **edição de campo exata**; **um cético tentou derrubar
   cada edição** — 249 de 253 sobreviveram (4 rejeitadas; 8 verbetes sem edição, porque a
   citação restaurada já resolvia).
3. **Conferência minha**, nos casos de maior risco:
   - as 29 trocas de tese: **todas as frases literais** da edição oficial citada (21 contíguas;
     8 com blocos da fonte emendados — em 4, ordem diferente da do informativo);
   - as 18 linhas de citação: literais da edição ou da consulta processual;
   - nenhuma limpeza de `precedentes` apaga texto sem devolvê-lo ao enunciado.

## 63. Regras de edição

- Nota em **"Comentário"** (`co`/`comentario`), **nunca** em "Observação" (`ob`) — o `ob` é
  mandado à IA como *"OBSERVAÇÃO DA FONTE"*. Prefixo fixo; termina na fonte.
- Tese só com trecho **literal** da fonte.
- Duplicata de texto idêntico: mesma edição só se o valor atual bater (`CTRLCONST-0153`
  ficou com o tema dele — é o mesmo trecho em outra seção).
- `ob` só pode ser **esvaziado**, quando guarda lixo do parser (`CTRLCONST-0109`).

## 64. CORREÇÃO do lote 9: as datas do Info 1204 e 1205

No lote 9 retirei a correção de ano dizendo que o erro era do STF e que o Cátedra devia seguir
a fonte. **Estava errado.** Para a data do julgamento, a fonte primária é a **certidão**:

- ARE 1.314.490 (Info 1204): *"Plenário, Sessão Virtual de 19/12/2025 a **06/02/2026**"*
- RE 1.408.525 (Info 1205): *"Julgamento Virtual: Mérito … de 06/02/2026 a **13/02/2026**"*

O informativo diz "sexta-feira", que só bate com 2026. A mesma decisão (ARE 1.314.490) já
aparecia com 2026 nas seleções; agora aparece igual em todo verbete, com nota de erro material.

## 65. Resultado

| | Web | Nativo |
|---|---|---|
| Registros alterados | 101 (texto) · 34 (índice) | 92 |
| Fora do escopo | 0 | 0 (conferido: nenhum registro fora do patch) |

Testes: bloco de 13 casos (10 falham no dado anterior). Chromium **2.193 ✓ 0 ✗**; WebKit com
o app gerado **391 ✓ 6 ✗** — as 6 idênticas às da `main` limpa (testes de toque do #97).
Os dois números são da suíte rodada **no Mac**: a CI do PR **não chegou a rodar** — o GitHub
recusou iniciar os jobs por pagamento falho ou limite de gastos da conta ("Billing & plans").
Instalado e conferido **nas duas cópias** no Mac e no
iPad: conteúdo e rótulos ok.

## 66. Placar da auditoria

| | |
|---|---|
| Achados corrigidos | **126** — 4 `pecas.js` (#96) · 12 rótulos (#93) · 9 informativos (#99) · 101 conteúdo (#109) |
| Retirados por reverificação | 2 (Tema 1090; e a retirada do lote 9, desfeita aqui) |
| Aguardando decisão | 6 (verbetes do STJ sob rótulo STF — seção 45) |
| Nativo | 113 correções em `corpus.json`, verificadas |

**A auditoria segue NÃO concluída**: 93 verbetes cortados (parte resolvida aqui), a citação
de origem ainda falta na web para o resto do controle de constitucionalidade (~365), ~9.700
acórdãos do STJ, 49 súmulas do STJ, e a leitura das 2.341 transcrições de banca.

---

# Lote 14 — o STJ fora do SCON: repetitivos, informativos, Jurisprudência em Teses e seleções

Período: 18 a 21/09/2026. **Nada foi alterado na plataforma**: tudo abaixo é achado e correção PROPOSTA.

## 67. Rotas oficiais que destravaram ~9.700 verbetes

O SCON continua recusando acesso (não tentei contornar). Quatro rotas oficiais respondem:

| Fonte oficial | O que dá | Cobertura obtida |
|---|---|---|
| Portal de repetitivos (`processo.stj.jus.br/repetitivos/…`) | ficha completa: situação, órgão, questão, tese, anotações, processos com relator e datas | **temas 1 a 1.474 — todos** |
| Informativo de Jurisprudência por edição (`…/informativo/?acao=pesquisarumaedicao&livre='NNNN'.cod.`) | nota a nota: processo, órgão, data, ramo, tema, destaque, inteiro teor | 285 edições (ordinárias e extraordinárias; a "Ed. Extraordinária 22" é `'0022E'`, não a ordinária 22 de 1999) |
| Busca no Informativo por processo (número pontuado e entre aspas) | as notas de um processo | 430 processos |
| "Jurisprudência em Teses — Edições n. 1 a 249" (STJ, dez/2024, BDJur 2011/132683) | as teses atualizadas, com data de edição e de atualização | edições **1 a 249** (o .txt do BDJur vem incompleto; extraí do PDF) |

## 68. Método

1. **Comparação mecânica** de cada verbete (web e nativo) com a fonte: texto literal, órgão, data, processo, relator, número, edição, situação (cancelado/revisado).
2. Tudo o que a máquina não fecha vai a um **conferente**, depois a um **cético** que tenta derrubar e, se sobreviver, a uma **segunda opinião** independente. Só entra o que passa pelos três.
3. **Controles**: verbetes que a máquina deu por limpos, misturados nos lotes sem aviso. Nenhum recebeu achado falso; os que receberam achado tinham defeito real que a máquina não olhava — e isso me levou à segunda rodada (seção 72).
4. **Minha conferência** de cada correção: texto proposto literal na fonte; metadado presente na ficha; nota do Cátedra só com citações literais. O que não passa fica marcado **"a preparar"**.

## 69. Resultado por bloco

| Bloco | Verbetes | Conferem com a fonte | Defeitos confirmados | Verbetes com defeito |
|---|---|---|---|---|
| Jurisprudência em Teses | 3.443 | 2.976 idênticos/contêm a tese + 29 com diferença trivial | 16 | 16 |
| Repetitivos | 1.173 | 509 limpos na comparação mecânica | 448 + 59 mecânicos | 264 + 59 |
| Informativos (+55 "Tema s/n") | 3.883 | 2.935 com destaque literal | 567 | 234 |
| Seleções dos TJs (julgados do STJ) | 1.233 | 765 | 700 | 258 |
| Texto a mais além da nota (2ª rodada) | 551 | 432 sem defeito | 132 | 112 |
| Palavra partida, conferida na fonte | — | — | 10 | 10 |
| **Total** | | | **1.932** | **905 verbetes** |

Gravidade: **156 alta** (ensina direito errado ou tema errado), 1.008 média, 699 baixa (metadado).
Correção pronta (literal ou metadado conferido): **1.412**. Correção **a preparar à mão**: **520**.

Tabelas completas — texto atual, correção proposta, verificação e link oficial de cada achado:
`lote14-jt-achados.md`, `lote14-repetitivos-achados.md`, `lote14-informativos-achados.md`,
`lote14-selecoes-stj-achados.md`, `lote14-texto-extra-achados.md`, `lote14-listas.md` (mecânicos,
não localizados, não verificáveis).

## 70. O que aparece, por tipo

- **Mistura de julgados** (seleções e informativos): o destaque certo vem colado com a tese de OUTRO
  processo, às vezes de sentido oposto. Ex.: INF2020-0693 abre com "não é obrigada a custear a
  fertilização in vitro" num verbete cujo julgado *reconhece* a cobertura da criopreservação.
- **Tese invertida ou condição perdida**: INF2024-0062 diz que a multa aduaneira "não se submete" à
  prescrição intercorrente — a 2ª Turma decidiu que se submete; JT-ED024-20 diz "sistema atributivo"
  onde a tese oficial diz "declarativo"; JT-ED143-04 perde "na hipótese de haver cláusula contratual de
  exclusão"; SELTJGO-0188 inverte o Tema 1173 (corretor NÃO responde, em regra).
- **Repetitivo com conteúdo de Turma**: STJ-453 põe como tese do tema um julgado da 3ª Turma que
  diz o contrário; STJ-x1255 apresenta como repetitivo a revisão a cada 90 dias que o Tema 1249 afastou.
- **Tema errado ou ausente**: o verbete "Tema 1300" é o Tema 130; dezenas de "Tema s/n" são temas
  identificáveis (1249, 1054, 961, 515…) ou não são repetitivos (IAC, Turma).
- **Edição errada** (56 verbetes, todos conferidos: a nota está na edição proposta e não na atual).
- **Tese perdida inteira** (seleções): enunciados reduzidos a "legítima." ou a "1.723 do CC. Publicidade…".
- **Lixo de processamento** no enunciado: URL, instrução ("mantido aqui para referência de formato…").
- **Metadados**: órgão, data (a do DJe no lugar da do julgamento), classe processual inexistente
  ("REsp no HC"), citação que termina em "Tema" sem número (59, corrigíveis mecanicamente).

## 71. Ressalva de atualidade

A compilação das Teses é um retrato de **dez/2024**; o STJ atualiza teses depois. Nos 2 achados
altos das Teses (JT-ED024-10 e 024-20) o texto do acervo não aparece em ponto nenhum da compilação
e não há data de atualização — são divergências da **fonte oficial disponível**; só o SCON (bloqueado)
mostraria uma eventual atualização posterior. Os 22 casos em que isso era plausível ficaram
**inconclusivos**, não achados.

## 72. CORREÇÕES minhas neste lote

- **Normalização de órgão**: o NFKC transforma "ª" em "a"; 518 divergências de órgão eram falsas.
  Consertei antes de qualquer conferência.
- **Layout antigo do Informativo** (até ~2016, sem rótulos): ~1.000 notas vinham vazias. Consertei o leitor.
- **Ponto cego da "mistura"**: eu tomava por limpo o verbete que CONTÉM o destaque oficial. Os
  controles mostraram que o destaque certo pode vir colado a outro julgado. Refiz a triagem em todos os
  blocos (texto a mais que não está na nota) → 2ª rodada, 132 defeitos a mais.
- **Duas correções que os revisores deixaram passar e eu rejeitei**: INF2021-0872 (a troca de edição
  deixaria texto de um julgado com órgão e data de outro — vira "a revisar") e STJ-x1139 ("Info 515"
  confundia o número do Tema 515 com informativo).
- Rede caiu (DNS) e o limite de sessão derrubou agentes duas vezes; os lotes foram retomados pelo cache,
  sem reconferir o que já tinha passado.

## 73. Placar da auditoria

| | |
|---|---|
| Corrigidos na plataforma (PRs #93, #96, #99, #109) | 126 |
| **Achados do STJ, propostos e não aplicados (este lote)** | **1.932 em 905 verbetes** |
| Retirados por reverificação | 2 + 2 correções rejeitadas neste lote |
| Aguardando decisão | 6 (seção 45) |

## 74. O que falta — a auditoria segue NÃO concluída

| Bloco | Situação |
|---|---|
| Teses edições 250 a 283 (345 verbetes) | sem fonte acessível (só SCON) |
| Informativos "sem edição" cujo processo não está em nenhum Informativo (192) + 13 não localizados | só SCON confirmaria |
| 22 inconclusivos das Teses, 11 dos repetitivos, 6 do texto extra | dependem de fonte posterior a dez/2024 |
| 49 súmulas do STJ sem fonte local; 4 processos de turma da camada autoral | as súmulas 666–676 saem do bloco "Súmulas" do Informativo — ainda não conferidas |
| 520 correções "a preparar" | defeito confirmado; redação da correção por fazer |
| Transcrição de banca (2.341), 93 verbetes cortados, ~365 CTRLCONST sem `fp`, 21 informativos STF suspeitos | pendentes dos lotes anteriores |

---

# Lote 15 — as correções prontas do STJ entram: PR #115

PR #115 · branch `auditoria-stj-lote14`
Nativo: VadeMecumJuris commit `34090a1` (`patches_auditoria_2026_09c.json`).

## 75. O que entrou

**1.343 correções em 743 verbetes**, nas duas cópias: 1.274 por edição exata de campo (redigida, verificada e
passada pela minha trava) e 69 mecânicas (59 citações sem o número do tema; 10 palavras partidas).
Web: 996 campos · nativo: 1.020 campos. Nenhuma edição pulada na conferência do valor atual.

## 76. O que NÃO entrou

Das 1.412 "prontas" do lote 14, **69 não viraram edição aplicada**: 60 barradas pela minha trava (texto que não
está literalmente em documento oficial do mesmo processo — em geral, comentário de terceiro reescrito) e o resto
recusado pelo verificador. Voltam para "a preparar", com as 520 do lote 14. Lista em
`~/catedra-auditoria-cache/pr-stj-nao-resolvidos.json` e `pr-stj-log.json` (recusadas, com o motivo).
Correção minha no caminho: o INF2023-0395 saiu da redação com título de Edição Extraordinária 9 mas `nu` vazio e
citação "Info 771" — completei pela convenção das extraordinárias (número = edição; citação "Ed. Extraordinária 9 STJ").

## 77. Testes e instalação

Bloco "STJ CONFERIDO NA FONTE" (14 casos; 14/14 falham na `main`). Chromium 2.495 ✓ 0 ✗; WebKit 649 ✓ 0 ✗.
Mac e iPad instalados; `confere-stj.mjs` nas duas cópias: nativo 1.020 campos, web 996/996, PRs #93/#109 intactos.

## 78. Placar

| | |
|---|---|
| Corrigidos na plataforma | 126 (PRs #93, #96, #99, #109) + **1.343 no PR #115** (aguardando merge) |
| A preparar (defeito confirmado, correção por redigir) | 520 + 69 |
| A auditoria | **segue NÃO concluída** — ver seção 74 |

---

# Lote 16 — as 589 correções "a preparar" redigidas à mão: PR #117

Período: 21–22/09/2026 · branch `auditoria-stj-pendentes` · nativo: VadeMecumJuris `ab7b62e`, `3fabdda`, `75f83a4` (`patches_auditoria_2026_09d.json`).

## 79. Método da redação

As 589 pendentes (520 do lote 14 + 69 que ficaram fora do #115) tinham defeito confirmado mas correção não literal.
Cada uma foi redigida de novo por um redator restrito a **três formas**: (a) trecho copiado literalmente da fonte oficial
do mesmo processo/tema; (b) remoção do trecho; (c) nota do Cátedra citando a fonte entre aspas. Um verificador aceitou ou
recusou cada edição (734 propostas, 63 recusadas). Depois, a **minha trava** (`verifica-pend2.py`): todo texto inserido
tem de estar literalmente num documento oficial baixado do mesmo processo, tema ou edição do verbete; data, órgão,
processo e edição têm de constar dele; nota só com citações literais — barrou 53. O aplicador confere o valor atual de
cada campo antes de mexer (2 puladas).

## 80. Resultado

| | |
|---|---|
| Defeitos resolvidos | **491** de 589 |
| Edições aplicadas | 314 na web · 365 no nativo, em 304 verbetes |
| Número alinhado ao título | 103 verbetes (21 deixados incoerentes pelo #115, 3 por este ramo, 79 pré-existentes com número vazio) |
| Verbetes alterados | **384** |
| Ficam "a preparar" | **98** (4 altas) — `lote16-fora-do-pr.md`, com o motivo de cada um |

## 81. CORREÇÕES minhas neste lote

- **A trava barrava de mais**: 223 exclusões na primeira passada, 47 na última. Falsos positivos meus, não das edições:
  o recorte de 5.000 caracteres do inteiro teor dado ao verificador; formas "1º/4/2025"; rótulo "(Info 872 do STJ)";
  número de lei tomado por número de processo; "Cátedra" e "Fonte" tratados como nome a conferir; e a nota casada por
  texto dos verbetes em segredo de justiça (sem número de processo). Consertei regra a regra, com depuração caso a caso.
- **Ordem dos patches no nativo**: `build_corpus.py` ordenava os `patches_*.json` pela ordem do sistema de arquivos — o
  09c podia sobrescrever o 09d. Agora desempata pelo nome; `verificar_auditoria.py` confere o último patch por campo.
- **Título × número**: o #115 trocou o título da edição em 21 verbetes e deixou o número antigo. A coerência que eu
  conferia era web × nativo, não título × número dentro da mesma cópia. Guarda nova no bloco de testes.
- **SELTJGO-0163**: a edição redigida trocava o enunciado pelo destaque da nota 861; o título e o assunto do verbete são
  do julgado do show artístico (nota 857) — é a citação que está errada. Excluí; fica a preparar.
- **INF2021-0872** (que no lote 15 eu tinha dado como mistura sem saída): o enunciado é o destaque do Info 713 e a
  citação nativa já trazia os dois julgados; título, número, órgão e data passam ao 713 — coerente.

## 82. Testes e instalação

Bloco "STJ, SEGUNDA LEVA" (14 casos; 14/14 falham na `main`). Chromium **2.520 ✓, 0 ✗**; WebKit **608 ✓, 0 ✗**.
- **Mac** (`/Applications`, Developer ID): nativo 469 campos deste lote no lugar; web 314/314; correções dos PRs #93/#109/#115 intactas.
- **iPad** (build de aparelho, instalado): nativo 469; web 314/314.

## 83. Placar

| | |
|---|---|
| Corrigidos na plataforma | 126 (PRs #93, #96, #99, #109) + 1.343 (#115) + **491 + 103 alinhamentos (PR #117)** |
| A preparar | 98 |
| Pré-existentes vistos de passagem | 3 títulos STJ com número do STF; ~47 palavras partidas não conferidas |
| A auditoria | **segue NÃO concluída** — ver seção 74 |
