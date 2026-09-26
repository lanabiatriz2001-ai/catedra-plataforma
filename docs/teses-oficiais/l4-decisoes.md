# Lote L4 — fusões, retiradas e fechamento (25–26/09/2026)

Troca das "Teses de RG e Repetitivos" (compilação repgeral-*, vinda do Dizer o Direito) pela fonte oficial do STF e do STJ.
O L4 aplica as decisões da dona de 25/09/2026 sobre o que os lotes L1–L3 deixaram de fora. Dados em `l4-referencia.json`.

## Contagem

- verbetes repgeral-* antes: 1943; depois: 1792
- fusões (um verbete por tema, estado migra para o canônico): 105
- retiradas: 46 (43 sem tema oficial + 3 pendentes do L3)
- STF-569-2 fica com a tese oficial do Tema 569 (era "fundir em STF-569", retirado)
- Notas do Cátedra retiradas (perderam o objeto): 3
- citações do STJ relabeladas "Rel. atual:": 1008 (L1 718, L2 206, L3 84)

## Regra de união do estado (fusões)

Migração nunca apaga: a chave antiga fica como cópia. Quando os dois ids têm estado: favorito, lido, dominado, importante e recente = OU; status do estudo (web) = o mais avançado (dominado > em revisão > nada); anotação, nota rica e afirmação falsa = concatenadas (canônico primeiro, depois a do id antigo, sem repetir texto que já está lá); grifos e marcações = união sem repetir; revisão espaçada (cartão) = a mais avançada (mais repetições; empate: maior intervalo; depois a próxima revisão mais tardia); coleção = o canônico entra onde o antigo estava; texto editado, alinhamento e roteiro de IA = o do canônico, e o do antigo só se o canônico não tiver. Roda uma vez por id (marca no próprio estado), para não reunir de novo o que a pessoa desfez depois.

## Relator

Relator do STF: o do julgamento de mérito, lido dos andamentos oficiais (texto da decisão; na falta, a cadeia de distribuição), com o redator do acórdão quando o relator ficou vencido — a exportação do STF traz o relator atual. Relator do STJ (desde o L4, decisão da dona): o portal de repetitivos só dá o relator ATUAL do processo, então a citação diz "Rel. atual: Min. X" em vez de sugerir que ele julgou.

Tabela de presidentes do STF (usada quando a relatoria é da Presidência) conferida nas páginas oficiais "Dados e Datas" e
nas biografias do portal do STF; duas janelas de exercício como Vice-Presidente entraram (17–22/11/2012, Joaquim Barbosa;
31/07–10/09/2014, Ricardo Lewandowski, cuja posse foi em 10/09/2014). Nenhuma tese dos lotes cai nessas janelas.

## Fusões

| id que sai | canônico | tema | origem |
|---|---|---|---|
| `repgeral-repercussao_geral-STF-100-2` | `repgeral-repercussao_geral-STF-100` | STF 100 | prévia (L0) |
| `repgeral-repercussao_geral-STF-1002-2` | `repgeral-repercussao_geral-STF-1002` | STF 1002 | prévia (L0) |
| `repgeral-repercussao_geral-STF-1019-2` | `repgeral-repercussao_geral-STF-1019` | STF 1019 | prévia (L0) |
| `repgeral-repercussao_geral-STF-1031-2` | `repgeral-repercussao_geral-STF-1031` | STF 1031 | prévia (L0) |
| `repgeral-repercussao_geral-STF-1041-2` | `repgeral-repercussao_geral-STF-1041` | STF 1041 | prévia (L0) |
| `repgeral-repercussao_geral-STF-1075-2` | `repgeral-repercussao_geral-STF-1075` | STF 1075 | prévia (L0) |
| `repgeral-repercussao_geral-STF-1120-2` | `repgeral-repercussao_geral-STF-1120` | STF 1120 | prévia (L0) |
| `repgeral-repercussao_geral-STF-116-2` | `repgeral-repercussao_geral-STF-116` | STF 116 | prévia (L0) |
| `repgeral-repercussao_geral-STF-1169-2` | `repgeral-repercussao_geral-STF-1169` | STF 1169 | prévia (L0) |
| `repgeral-repercussao_geral-STF-1170-2` | `repgeral-repercussao_geral-STF-1170` | STF 1170 | prévia (L0) |
| `repgeral-repercussao_geral-STF-1170-3` | `repgeral-repercussao_geral-STF-1170` | STF 1170 | prévia (L0) |
| `repgeral-repercussao_geral-STF-1234-2` | `repgeral-repercussao_geral-STF-1234` | STF 1234 | prévia (L0) |
| `repgeral-repercussao_geral-STF-1262-2` | `repgeral-repercussao_geral-STF-1262` | STF 1262 | prévia (L0) |
| `repgeral-repercussao_geral-STF-1282-2` | `repgeral-repercussao_geral-STF-1282` | STF 1282 | prévia (L0) |
| `repgeral-repercussao_geral-STF-1370-2` | `repgeral-repercussao_geral-STF-1370` | STF 1370 | prévia (L0) |
| `repgeral-repercussao_geral-STF-210-2` | `repgeral-repercussao_geral-STF-210` | STF 210 | prévia (L0) |
| `repgeral-repercussao_geral-STF-210-3` | `repgeral-repercussao_geral-STF-210` | STF 210 | prévia (L0) |
| `repgeral-repercussao_geral-STF-27-2` | `repgeral-repercussao_geral-STF-27` | STF 27 | L3 |
| `repgeral-repercussao_geral-STF-312` | `repgeral-repercussao_geral-STF-27` | STF 27 | L3 |
| `repgeral-repercussao_geral-STF-323-2` | `repgeral-repercussao_geral-STF-323` | STF 323 | L3 |
| `repgeral-repercussao_geral-STF-323-3` | `repgeral-repercussao_geral-STF-323` | STF 323 | prévia (L0) |
| `repgeral-repercussao_geral-STF-393-2` | `repgeral-repercussao_geral-STF-393` | STF 393 | prévia (L0) |
| `repgeral-repercussao_geral-STF-477-2` | `repgeral-repercussao_geral-STF-477` | STF 477 | prévia (L0) |
| `repgeral-repercussao_geral-STF-478-2` | `repgeral-repercussao_geral-STF-478` | STF 478 | prévia (L0) |
| `repgeral-repercussao_geral-STF-492-2` | `repgeral-repercussao_geral-STF-492` | STF 492 | prévia (L0) |
| `repgeral-repercussao_geral-STF-545-2` | `repgeral-repercussao_geral-STF-545` | STF 545 | prévia (L0) |
| `repgeral-repercussao_geral-STF-627-2` | `repgeral-repercussao_geral-STF-627` | STF 627 | prévia (L0) |
| `repgeral-repercussao_geral-STF-733-2` | `repgeral-repercussao_geral-STF-733` | STF 733 | prévia (L0) |
| `repgeral-repercussao_geral-STF-761-2` | `repgeral-repercussao_geral-STF-761` | STF 761 | prévia (L0) |
| `repgeral-repercussao_geral-STF-771-2` | `repgeral-repercussao_geral-STF-771` | STF 771 | L3 |
| `repgeral-repercussao_geral-STF-771-3` | `repgeral-repercussao_geral-STF-771` | STF 771 | L3 |
| `repgeral-repercussao_geral-STF-857-2` | `repgeral-repercussao_geral-STF-857` | STF 857 | prévia (L0) |
| `repgeral-repercussao_geral-STF-881-2` | `repgeral-repercussao_geral-STF-881` | STF 881 | prévia (L0) |
| `repgeral-repercussao_geral-STF-881-3` | `repgeral-repercussao_geral-STF-881` | STF 881 | L3 |
| `repgeral-repercussao_geral-STF-967-2` | `repgeral-repercussao_geral-STF-967` | STF 967 | prévia (L0) |
| `repgeral-repercussao_geral-STF-x110` | `repgeral-repercussao_geral-STF-642` | STF 642 | prévia (L0) |
| `repgeral-repercussao_geral-STF-x117` | `repgeral-repercussao_geral-STF-642` | STF 642 | prévia (L0) |
| `repgeral-repercussao_geral-STF-x1371` | `repgeral-repercussao_geral-STF-32` | STF 32 | prévia (L0) |
| `repgeral-repercussao_geral-STF-x1713` | `repgeral-repercussao_geral-STF-669` | STF 669 | prévia (L0) |
| `repgeral-repercussao_geral-STJ-x1120` | `repgeral-repercussao_geral-STF-82` | STF 499 | prévia (L0) |
| `repgeral-repercussao_geral-STJ-x1298` | `repgeral-repercussao_geral-STF-1068` | STF 1068 | prévia (L0) |
| `repgeral-repercussao_geral-STJ-x1702` | `repgeral-repercussao_geral-STF-495` | STF 495 | prévia (L0) |
| `repgeral-repetitivo-STF-185-2` | `repgeral-repetitivo-STF-185` | STJ 185 | prévia (L0) |
| `repgeral-repetitivo-STF-x1175` | `repgeral-repetitivo-STJ-157` | STJ 157 | prévia (L0) |
| `repgeral-repetitivo-STF-x1201` | `repgeral-repetitivo-STJ-1155` | STJ 1155 | prévia (L0) |
| `repgeral-repetitivo-STJ-1000-2` | `repgeral-repetitivo-STJ-1000` | STJ 1000 | prévia (L0) |
| `repgeral-repetitivo-STJ-1059-2` | `repgeral-repetitivo-STJ-1059` | STJ 1059 | prévia (L0) |
| `repgeral-repetitivo-STJ-1074-2` | `repgeral-repetitivo-STJ-1074` | STJ 1074 | prévia (L0) |
| `repgeral-repetitivo-STJ-108-2` | `repgeral-repetitivo-STJ-108` | STJ 108 | prévia (L0) |
| `repgeral-repetitivo-STJ-1092-2` | `repgeral-repetitivo-STJ-1092` | STJ 1092 | prévia (L0) |
| `repgeral-repetitivo-STJ-1093-2` | `repgeral-repetitivo-STJ-1093` | STJ 1093 | prévia (L0) |
| `repgeral-repetitivo-STJ-1112-2` | `repgeral-repetitivo-STJ-1112` | STJ 1112 | prévia (L0) |
| `repgeral-repetitivo-STJ-1134-2` | `repgeral-repetitivo-STJ-1134` | STJ 1134 | prévia (L0) |
| `repgeral-repetitivo-STJ-1149-2` | `repgeral-repetitivo-STJ-1149` | STJ 1149 | prévia (L0) |
| `repgeral-repetitivo-STJ-117-2` | `repgeral-repetitivo-STJ-117` | STJ 117 | prévia (L0) |
| `repgeral-repetitivo-STJ-1190-2` | `repgeral-repetitivo-STJ-1190` | STJ 1190 | prévia (L0) |
| `repgeral-repetitivo-STJ-1194-2` | `repgeral-repetitivo-STJ-1194` | STJ 1194 | prévia (L0) |
| `repgeral-repetitivo-STJ-1215-2` | `repgeral-repetitivo-STJ-1215` | STJ 1215 | prévia (L0) |
| `repgeral-repetitivo-STJ-1218-2` | `repgeral-repetitivo-STJ-1218` | STJ 1218 | prévia (L0) |
| `repgeral-repetitivo-STJ-1218-3` | `repgeral-repetitivo-STJ-1218` | STJ 1218 | prévia (L0) |
| `repgeral-repetitivo-STJ-1245-2` | `repgeral-repetitivo-STJ-1245` | STJ 1245 | prévia (L0) |
| `repgeral-repetitivo-STJ-1265-2` | `repgeral-repetitivo-STJ-1265` | STJ 1265 | prévia (L0) |
| `repgeral-repetitivo-STJ-1347-2` | `repgeral-repetitivo-STJ-1347` | STJ 1347 | prévia (L0) |
| `repgeral-repetitivo-STJ-1408-2` | `repgeral-repetitivo-STJ-1408` | STJ 1408 | prévia (L0) |
| `repgeral-repetitivo-STJ-1410-2` | `repgeral-repetitivo-STJ-1410` | STJ 1410 | prévia (L0) |
| `repgeral-repetitivo-STJ-16-2` | `repgeral-repetitivo-STJ-16` | STJ 16 | prévia (L0) |
| `repgeral-repetitivo-STJ-17-2` | `repgeral-repetitivo-STJ-17` | STJ 17 | prévia (L0) |
| `repgeral-repetitivo-STJ-230-2` | `repgeral-repetitivo-STJ-230` | STJ 230 | prévia (L0) |
| `repgeral-repetitivo-STJ-260-2` | `repgeral-repetitivo-STJ-260` | STJ 260 | prévia (L0) |
| `repgeral-repetitivo-STJ-293-2` | `repgeral-repetitivo-STJ-293` | STJ 293 | prévia (L0) |
| `repgeral-repetitivo-STJ-368-2` | `repgeral-repetitivo-STJ-368` | STJ 368 | prévia (L0) |
| `repgeral-repetitivo-STJ-371-2` | `repgeral-repetitivo-STJ-371` | STJ 371 | prévia (L0) |
| `repgeral-repetitivo-STJ-380-2` | `repgeral-repetitivo-STJ-380` | STJ 380 | prévia (L0) |
| `repgeral-repetitivo-STJ-588-2` | `repgeral-repetitivo-STJ-588` | STJ 588 | prévia (L0) |
| `repgeral-repetitivo-STJ-589-2` | `repgeral-repetitivo-STJ-589` | STJ 589 | prévia (L0) |
| `repgeral-repetitivo-STJ-614-2` | `repgeral-repetitivo-STJ-614` | STJ 614 | prévia (L0) |
| `repgeral-repetitivo-STJ-660-2` | `repgeral-repetitivo-STJ-660` | STJ 660 | L3 |
| `repgeral-repetitivo-STJ-660-4` | `repgeral-repetitivo-STJ-660` | STJ 660 | prévia (L0) |
| `repgeral-repetitivo-STJ-671-2` | `repgeral-repetitivo-STJ-871` | STJ 871 | prévia (L0) |
| `repgeral-repetitivo-STJ-677-2` | `repgeral-repetitivo-STJ-677` | STJ 677 | prévia (L0) |
| `repgeral-repetitivo-STJ-689-2` | `repgeral-repetitivo-STJ-689` | STJ 689 | prévia (L0) |
| `repgeral-repetitivo-STJ-692-2` | `repgeral-repetitivo-STJ-692` | STJ 692 | prévia (L0) |
| `repgeral-repetitivo-STJ-717-2` | `repgeral-repetitivo-STJ-717` | STJ 717 | prévia (L0) |
| `repgeral-repetitivo-STJ-766-2` | `repgeral-repetitivo-STJ-766` | STJ 766 | prévia (L0) |
| `repgeral-repetitivo-STJ-86-2` | `repgeral-repetitivo-STJ-86` | STJ 86 | prévia (L0) |
| `repgeral-repetitivo-STJ-905-2` | `repgeral-repetitivo-STJ-905` | STJ 905 | prévia (L0) |
| `repgeral-repetitivo-STJ-919-2` | `repgeral-repetitivo-STJ-919` | STJ 919 | prévia (L0) |
| `repgeral-repetitivo-STJ-938-2` | `repgeral-repetitivo-STJ-938` | STJ 938 | prévia (L0) |
| `repgeral-repetitivo-STJ-958-2` | `repgeral-repetitivo-STJ-958` | STJ 958 | prévia (L0) |
| `repgeral-repetitivo-STJ-958-3` | `repgeral-repetitivo-STJ-958` | STJ 958 | prévia (L0) |
| `repgeral-repetitivo-STJ-970-2` | `repgeral-repetitivo-STJ-970` | STJ 970 | prévia (L0) |
| `repgeral-repetitivo-STJ-972-2` | `repgeral-repetitivo-STJ-972` | STJ 972 | prévia (L0) |
| `repgeral-repetitivo-STJ-972-3` | `repgeral-repetitivo-STJ-972` | STJ 972 | prévia (L0) |
| `repgeral-repetitivo-STJ-980-2` | `repgeral-repetitivo-STJ-980` | STJ 980 | prévia (L0) |
| `repgeral-repetitivo-STJ-996-2` | `repgeral-repetitivo-STJ-996` | STJ 996 | prévia (L0) |
| `repgeral-repetitivo-STJ-996-3` | `repgeral-repetitivo-STJ-996` | STJ 996 | prévia (L0) |
| `repgeral-repetitivo-STJ-996-4` | `repgeral-repetitivo-STJ-996` | STJ 996 | prévia (L0) |
| `repgeral-repetitivo-STJ-x1153` | `repgeral-repetitivo-STJ-x1139` | STJ 515 | prévia (L0) |
| `repgeral-repetitivo-STJ-x1253` | `repgeral-repetitivo-STJ-x1251` | STJ 1249 | prévia (L0) |
| `repgeral-repetitivo-STJ-x1255` | `repgeral-repetitivo-STJ-x1251` | STJ 1249 | prévia (L0) |
| `repgeral-repetitivo-STJ-x1825` | `repgeral-repetitivo-STJ-478` | STJ 478 | prévia (L0) |
| `repgeral-repetitivo-STJ-x360` | `repgeral-repercussao_geral-STF-942` | STF 942 | prévia (L0) |
| `repgeral-repetitivo-STJ-x663` | `repgeral-repetitivo-STJ-970` | STJ 970 | prévia (L0) |
| `repgeral-repetitivo-STJ-x666` | `repgeral-repetitivo-STJ-938` | STJ 938 | prévia (L0) |
| `repgeral-repetitivo-STJ-x838` | `repgeral-repetitivo-STJ-x837` | STJ 743 | prévia (L0) |

## Retiradas

| id | rótulo antigo | motivo |
|---|---|---|
| `repgeral-repercussao_geral-STF-569` | STF · Tema 569 (RG) | L3 pendente: trata só da legitimidade do MPT para recorrer ao STF contra decisão do TST, preliminar do RE 789874; o Tema 569 é outro (Sistema S sem concurso), que fica com o 569-2 — decisão da dona (L4) |
| `repgeral-repercussao_geral-STF-x100` | STF · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STF-x1436` | STF · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STF-x150` | STF · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STF-x151` | STF · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STF-x1647` | STF · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STF-x1648` | STF · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STF-x1859` | STF · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STF-x1960` | STF · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STF-x258` | STF · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STF-x263` | STF · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STF-x287` | STF · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STF-x288` | STF · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STF-x412` | STF · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STF-x477` | STF · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STF-x604` | STF · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STF-x814` | STF · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STF-x970` | STF · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STJ-x116` | STJ · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STJ-x1381` | STJ · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STJ-x1625` | STJ · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STJ-x1669` | STJ · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STJ-x2014` | STJ · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STJ-x229` | STJ · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STJ-x350` | STJ · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STJ-x616` | STJ · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STJ-x618` | STJ · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repercussao_geral-STJ-x631` | STJ · Tema s/n (RG) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repetitivo-STF-x1197` | STF · Tema s/n (Repetitivo) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repetitivo-STF-x1207` | STF · Tema s/n (Repetitivo) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repetitivo-STJ-x1060` | STJ · Tema/IAC 3 | L3 pendente: IAC 3 do STJ, não é repetitivo nem RG e não tem rota oficial — decisão da dona (L4) |
| `repgeral-repetitivo-STJ-x1199` | STJ · Tema s/n (Repetitivo) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repetitivo-STJ-x1248` | STJ · Tema s/n (Repetitivo) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repetitivo-STJ-x1265` | STJ · Tema s/n (Repetitivo) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repetitivo-STJ-x1286` | STJ · Tema s/n (Repetitivo) | L3 pendente: julgado da 5ª Turma (Pet no REsp 1.468.085-PA), não é repetitivo; nenhum tema oficial trata da questão — decisão da dona (L4) |
| `repgeral-repetitivo-STJ-x1320` | STJ · Tema s/n (Repetitivo) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repetitivo-STJ-x1410` | STJ · Tema s/n (Repetitivo) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repetitivo-STJ-x1462` | STJ · Tema s/n (Repetitivo) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repetitivo-STJ-x1752` | STJ · Tema s/n (Repetitivo) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repetitivo-STJ-x235` | STJ · Tema s/n (Repetitivo) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repetitivo-STJ-x267` | STJ · Tema s/n (Repetitivo) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repetitivo-STJ-x55` | STJ · Tema s/n (Repetitivo) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repetitivo-STJ-x641` | STJ · Info 788 · STJ | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repetitivo-STJ-x657` | STJ · Tema s/n (Repetitivo) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repetitivo-STJ-x676` | STJ · Tema s/n (Repetitivo) | sem tema oficial — decisão da dona (25/09/2026) |
| `repgeral-repetitivo-STJ-x938` | STJ · Tema s/n | sem tema oficial — decisão da dona (25/09/2026) |

## Notas do Cátedra retiradas

- `repgeral-repetitivo-STJ-1300`: a nota dizia que o texto do verbete era o do Tema 130 e não o do 1300; com a troca, o verbete mostra a tese oficial do Tema 130 e a nota perdeu o objeto
- `repgeral-repetitivo-STJ-x678`: a nota dizia que o julgado citado (EAREsp 793.323-RJ) não era repetitivo; com a troca, o verbete é a tese oficial do Tema 1032 e a nota perdeu o objeto
- `repgeral-repetitivo-STJ-x1242`: a nota dizia que o julgado (REsp 1.468.099-MG, 6ª Turma) não era repetitivo; com a troca, o verbete é a tese oficial do Tema 901 e a nota perdeu o objeto

## Para a dona decidir (nada foi mudado por isto)

Retirados cujo texto antigo contém a tese oficial INTEIRA de um tema que nenhum verbete do acervo usa. A decisão foi
retirar todos os 43; se algum destes deve voltar como o verbete do tema, basta passar o id de "retirar" para "aplicar"
no gerador — o estado da pessoa por esse id ficou no disco e reaparece sozinho.

| id | tema oficial livre | cobertura da tese no texto |
|---|---|---|
| `repgeral-repercussao_geral-STF-x1436` | STF 962 | 1.0 |
| `repgeral-repercussao_geral-STF-x151` | STF 1253 | 0.94 |
| `repgeral-repercussao_geral-STF-x1647` | STF 304 | 1.0 |
| `repgeral-repercussao_geral-STF-x1648` | STF 304 | 0.92 |
| `repgeral-repercussao_geral-STF-x1960` | STF 985 | 1.0 |
| `repgeral-repercussao_geral-STF-x477` | STF 666 | 1.0 |
| `repgeral-repercussao_geral-STJ-x1381` | STF 437 | 1.0 |
| `repgeral-repercussao_geral-STJ-x2014` | STF 1166 | 1.0 |
| `repgeral-repetitivo-STF-x1207` | STJ 924 | 1.0 |
| `repgeral-repetitivo-STJ-x1265` | STF 712 | 1.0 |
