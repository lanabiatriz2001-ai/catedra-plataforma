# Atualização assistida de 25/11/2026 — temas de repercussão geral e repetitivos

Leitura nova da fonte oficial, conferida tema a tema, dos temas de repercussão geral do STF e de recursos
repetitivos do STJ que o acervo do CátedraJURIS já tem. Ponto de partida: o sentinela de 25/11/2026 apontava,
nesses temas, situações e teses diferentes da fonte oficial e teses fixadas fora do acervo ("Conferir" na Central).

- **Fontes** (lidas em 25/11/2026, retrato em `~/catedra-auditoria-cache/teses-dod/l5/`): STF — lista de todos os temas
  (`exportarDados.asp`, 1.495 temas), banco de teses (`retornartesesrepercussaogeral.asp`) e os andamentos do
  leading case de cada tema (`verAndamentoProcesso.asp`, a página oficial do tema); STJ — fichas do portal de
  precedentes em faixas de 50 (1.473 temas, até o 1474) e a pesquisa de cada tema sozinho, que tem de dizer o
  mesmo que a faixa. UA de Chrome no STF e o UA honesto do Cátedra no STJ, pausa de 3 s.
- **Regras** (as dos lotes L1–L4): o id não muda; o registro novo parte do registro atual do lote e troca só o
  que a fonte mudou; tese literal do banco do STF (na falta, da decisão de julgamento) ou do portal do STJ;
  decisões manuais dos lotes e dos avisos de 03/10/2026 ficam.
- **Dados**: `atualizacao-2026-11-25.json` (gerador: `scripts/aplicar-teses-oficiais.py`, web e nativo). Cada
  registro diz o lote que substitui, o que mudou (antes → depois), o motivo e a conferência na página oficial.

## O que mudou no acervo (25 verbetes oficiais)

| Tema | Verbete | O que mudou | Conferido na fonte |
|---|---|---|---|
| STF 106 | `repgeral-repercussao_geral-STF-106` | situacao: Mérito julgado → Cancelado; observacao: — → Tema cancelado em 15/10/2026. Decisão de 15/10/2026: O Tribunal, por… | situação "Cancelado"; acórdão publicado em 20/02/2009; julgamento de mérito em 21/08/2020 (Tribunal Pleno, Sessão Virtual); tema cancelado em 15/10/2026.… |
| STF 516 | `repgeral-repercussao_geral-STF-516` | tese: a do banco de teses do STF, igual à da decisão com o ponto final; situacao: Acórdão de mérito publicado → Trânsito em Julgado | situação "Trânsito em Julgado"; julgamento de mérito em 25/05/2026 (Tribunal Pleno, Sessão Virtual); acórdão publicado em 01/07/2026; acórdão publicado em… |
| STF 837 | `repgeral-repercussao_geral-STF-837` | situacao: Acórdão de mérito publicado → Trânsito em Julgado | situação "Trânsito em Julgado"; julgamento de mérito em 11/02/2026 (Tribunal Pleno); acórdão publicado em 31/08/2026; acórdão publicado em 10/11/2026; trânsito… |
| STF 912 | `repgeral-repercussao_geral-STF-912` | tese: a do banco de teses do STF, igual à da decisão com o ponto final | situação "Trânsito em Julgado"; acórdão publicado em 12/12/2016; julgamento de mérito em 25/05/2026 (Tribunal Pleno, Sessão Virtual); acórdão publicado em… |
| STF 1016 | `repgeral-repercussao_geral-STF-1016` | situacao: Acórdão de Repercussão Geral publicado → Mérito julgado; enunciado: Tema sem tese firmada. Questão: Recurso… → 1. O depósito judicial é figura processual de direito público, e a…; data: — → 14/10/2026; precedentes: RE 1141156 (leading case), Rel. Min. Edson Fachin → RE 1141156 (leading case), Rel. Min. Edson Fachin, Red. p/ o acórdão… | situação "Mérito julgado"; acórdão publicado em 12/03/2019; acórdão publicado em 03/04/2020; julgamento de mérito em 14/10/2026 (Tribunal Pleno). A tese foi… |
| STF 1427 | `repgeral-repercussao_geral-STF-1427` | situacao: Acórdão de mérito publicado → Trânsito em Julgado | situação "Trânsito em Julgado"; acórdão publicado em 02/03/2026; acórdão publicado em 23/10/2026; trânsito em julgado em 04/11/2026. |
| STJ 67 | `repgeral-repetitivo-STJ-67` | situacao: Acórdão Publicado → Acórdão Publicado - RE Pendente | situação "Acórdão Publicado - RE Pendente"; Pet 17904/RJ (principal): afetação 06/11/2025, julgado em 20/08/2026, acórdão publicado em 03/09/2026; REsp… |
| STJ 1124 | `repgeral-repetitivo-STJ-1124` | situacao: Acórdão Publicado → Trânsito em Julgado | situação "Trânsito em Julgado"; REsp 1913152/SP (principal): afetação 17/12/2021, julgado em 08/10/2025, acórdão publicado em 06/11/2025, trânsito em julgado… |
| STJ 1130 | `repgeral-repetitivo-STJ-1130` | situacao: Acórdão Publicado - RE Pendente → Trânsito em Julgado | situação "Trânsito em Julgado"; REsp 1966058/AL (principal): afetação 23/02/2022, julgado em 09/10/2024, acórdão publicado em 11/10/2024, trânsito em julgado… |
| STJ 1153 | `repgeral-repetitivo-STJ-1153` | situacao: Acórdão Publicado - RE Pendente → Trânsito em Julgado | situação "Trânsito em Julgado"; REsp 1954380/SP (principal): afetação 06/05/2022, julgado em 05/06/2024, acórdão publicado em 17/09/2024, trânsito em julgado… |
| STJ 1158 | `repgeral-repetitivo-STJ-1158` | situacao: Acórdão Publicado → Trânsito em Julgado | situação "Trânsito em Julgado"; REsp 1949182/SP (principal): afetação 01/08/2022, julgado em 12/03/2025, acórdão publicado em 19/03/2025, trânsito em julgado… |
| STJ 1190 | `repgeral-repetitivo-STJ-1190` | situacao: Acórdão Publicado - RE Pendente → Trânsito em Julgado | situação "Trânsito em Julgado"; REsp 2029636/SP (principal): afetação 27/04/2023, julgado em 20/06/2024, acórdão publicado em 01/07/2024, trânsito em julgado… |
| STJ 1195 | `repgeral-repetitivo-STJ-1195` | precedentes: REsp 2011706/MG, Rel. atual: Min. Og Fernandes,… → REsp 2011706/MG, Rel. atual: Des. convocada Fátima Maranhão (TJPB),… | situação "Acórdão Publicado"; REsp 2011706/MG (principal): afetação 03/05/2023, julgado em 10/12/2025, acórdão publicado em 16/12/2025. O relator atual dos… |
| STJ 1198 | `repgeral-repetitivo-STJ-1198` | situacao: Acórdão Publicado - RE Pendente → Trânsito em Julgado | situação "Trânsito em Julgado"; REsp 2021665/MS (principal): afetação 09/05/2023, julgado em 13/03/2025, acórdão publicado em 11/06/2026, trânsito em julgado… |
| STJ 1229 | `repgeral-repetitivo-STJ-1229` | situacao: Acórdão Publicado - RE Pendente → Trânsito em Julgado | situação "Trânsito em Julgado"; REsp 2046269/PR (principal): afetação 19/12/2023, julgado em 09/10/2024, acórdão publicado em 15/10/2024, trânsito em julgado… |
| STJ 1236 | `repgeral-repetitivo-STJ-1236` | precedentes: REsp 2085556/MG, Rel. atual: Min. Og Fernandes,… → REsp 2085556/MG, Rel. atual: Des. convocada Fátima Maranhão (TJPB),… | situação "Acórdão Publicado"; REsp 2085556/MG (principal): afetação 11/03/2024, julgado em 06/11/2025, acórdão publicado em 12/11/2025; REsp 2086269/MG:… |
| STJ 1304 | `repgeral-repetitivo-STJ-1304` | situacao: Acórdão Publicado → Trânsito em Julgado | situação "Trânsito em Julgado"; REsp 2119311/SC (principal): afetação 08/01/2025, julgado em 10/12/2025, acórdão publicado em 17/12/2025, trânsito em julgado… |
| STJ 1311 | `repgeral-repetitivo-STJ-1311` | situacao: Acórdão Publicado - RE Pendente → Trânsito em Julgado | situação "Trânsito em Julgado"; REsp 2057984/CE (principal): afetação 24/02/2025, julgado em 11/06/2025, acórdão publicado em 16/06/2025, trânsito em julgado… |
| STJ 1312 | `repgeral-repetitivo-STJ-1312` | situacao: Acórdão Publicado - RE Pendente → Trânsito em Julgado | situação "Trânsito em Julgado"; REsp 2151903/RS (principal): afetação 24/02/2025, julgado em 11/03/2026, acórdão publicado em 17/03/2026, trânsito em julgado… |
| STJ 1329 | `repgeral-repetitivo-STJ-1329` | situacao: Acórdão Publicado → Acórdão Publicado - RE Pendente | situação "Acórdão Publicado - RE Pendente"; REsp 2154295/RS (principal): afetação 14/04/2025, julgado em 08/10/2025, acórdão publicado em 21/10/2025; REsp… |
| STJ 1373 | `repgeral-repetitivo-STJ-1373` | situacao: Acórdão Publicado → Acórdão Publicado - RE Pendente | situação "Acórdão Publicado - RE Pendente"; REsp 2198235/CE (principal): afetação 19/08/2025, julgado em 11/03/2026, acórdão publicado em 17/03/2026; REsp… |
| STJ 1380 | `repgeral-repetitivo-STJ-1380` | situacao: Acórdão Publicado → Acórdão Publicado - RE Pendente | situação "Acórdão Publicado - RE Pendente"; EREsp 2090133/SP (principal): afetação 17/09/2025, julgado em 07/05/2026, acórdão publicado em 18/05/2026; REsp… |
| STJ 1401 | `repgeral-repetitivo-STJ-1401` | situacao: Acórdão Publicado - RE Pendente → Trânsito em Julgado | situação "Trânsito em Julgado"; REsp 2238302/DF (principal): afetação 19/12/2025, julgado em 07/05/2026, acórdão publicado em 15/05/2026, trânsito em julgado… |
| STJ 1413 | `repgeral-repetitivo-STJ-1413` | situacao: Acórdão Publicado → Trânsito em Julgado | situação "Trânsito em Julgado"; REsp 2215141/PE (principal): afetação 03/03/2026, julgado em 10/06/2026, acórdão publicado em 18/06/2026, trânsito em julgado… |
| STJ 1421 | `repgeral-repetitivo-STJ-1421` | situacao: Acórdão Publicado - RE Pendente → Trânsito em Julgado | situação "Trânsito em Julgado"; REsp 2256869/SP (principal): afetação 30/03/2026, julgado em 10/06/2026, acórdão publicado em 17/06/2026, trânsito em julgado… |

## Situação oficial nos verbetes da compilação "Coordenados 2026" (117)

Verbetes `COORD-*` (compilação de curso, sem situação no acervo) cujo texto é a tese oficial do tema — igual,
ou contida nele — ganham só a situação oficial. Onde o texto não é a tese oficial, nada muda (ver "Para a dona
decidir"): situação oficial em cima de texto que não é a tese ficaria enganosa.

- **STF — Acórdão de mérito publicado** (2): 304, 1338*
- **STF — Trânsito em Julgado** (54): 16, 21, 69, 117, 129, 148, 156, 177, 190, 262, 279, 299, 349, 359, 394, 395, 408, 437, 503, 514, 530, 576, 581, 638, 643, 645, 666, 671, 676, 712, 761, 768*, 779, 815*, 825, 827, 860, 907, 928, 939, 947, 951, 962, 985*, 990, 1010, 1047*, 1074, 1081, 1095*, 1127, 1166, 1240, 1335
- **STJ — Revisado** (3): 137, 280, 281
- **STJ — Trânsito em Julgado** (58): 18, 63, 78, 130, 147, 205, 220, 233, 246, 247, 269, 273, 276, 285, 292, 307, 308, 325, 326, 340, 417, 418, 424, 433, 437, 439, 440, 441, 491, 504, 510, 515, 552, 554, 565, 568, 577, 581, 596, 609, 616, 621, 668, 676, 680, 705, 706, 721, 728, 743*, 869, 882, 901, 924, 959, 961, 1054, 1141

\* texto do acervo contém a tese oficial e mais alguma coisa.

## O que ficou igual, de propósito

- **`[sic]` dos avisos de 03/10/2026** — STF 394 e STJ 1123, 1149 e 1249: o erro de digitação é da própria fonte e
  ficou marcado; a fonte segue com ele.
- **Observações dos lotes L2/L3 e dos avisos** — 16 verbetes do STJ têm, na observação, trechos literais da ficha
  (NUGEPNAC, modulação) ou o "também cobre o Tema N" do caso c do L3. Não são mudança da fonte.
- **STF 936, 950, 1308, 1382 e 1451** — o banco de teses e a lista oficial ainda não trazem a tese; o acervo segue
  com a tese literal da decisão de julgamento (vazio na fonte não apaga o que já foi conferido).
- **STJ 1245** — a ficha oficial diz "Acórdão Publicado - RE Pendente": só um dos dois paradigmas (REsp 2066696/RS)
  transitou, em 05/11/2026; o principal (REsp 2054759/RS) tem recurso extraordinário pendente. O acervo fica com a
  situação da ficha. O sentinela, que lê a data do paradigma, segue apontando "Trânsito em Julgado".

## Central de novidades

Rodado `node scripts/sentinela.mjs --fonte stf,stj --colecoes rg,repetitivos` depois da atualização. Dos itens de RG e
repetitivos, 24 receberam baixa ("No acervo · já no JURIS"); 4 de temas que o acervo tem seguem "Conferir";
159 são de temas fora do acervo (entram só com os sugeridos); 3 item(ns) novo(s) nesta rodada.

- **Baixa (24)**: STF 1016 (julgamento: Mérito julgado); STF 106 (situacao: Cancelado); STF 1427 (situacao: Trânsito em Julgado); STF 516 (situacao: Trânsito em Julgado); STF 516 (tese-fixada); STF 837 (situacao: Trânsito em Julgado); STF 912 (tese-fixada); STJ 1124 (situacao: Trânsito em Julgado); STJ 1130 (situacao: Trânsito em Julgado); STJ 1153 (situacao: Trânsito em Julgado); STJ 1158 (situacao: Trânsito em Julgado); STJ 1190 (situacao: Trânsito em Julgado); STJ 1198 (situacao: Trânsito em Julgado); STJ 1229 (situacao: Trânsito em Julgado); STJ 1304 (situacao: Trânsito em Julgado); STJ 1311 (situacao: Trânsito em Julgado); STJ 1312 (situacao: Trânsito em Julgado); STJ 1329 (situacao: Acórdão Publicado - RE Pendente); STJ 1373 (situacao: Acórdão Publicado - RE Pendente); STJ 1380 (situacao: Acórdão Publicado - RE Pendente); STJ 1401 (situacao: Trânsito em Julgado); STJ 1413 (situacao: Trânsito em Julgado); STJ 1421 (situacao: Trânsito em Julgado); STJ 67 (situacao: Acórdão Publicado - RE Pendente).
- **Seguem "Conferir" (4)**, por motivo:
  - STJ 1245 (situacao: Trânsito em Julgado) — a ficha oficial diz "Acórdão Publicado - RE Pendente"; o item vem da data de trânsito de um só paradigma
  - STJ 50 (acordao-publicado: Acórdão Publicado) — o acervo só tem o COORD-REP-50, com a tese antiga — decisão da dona (item 3)
  - STJ 50 (tese-fixada) — o acervo só tem o COORD-REP-50, com a tese antiga — decisão da dona (item 3)
  - STJ 1304 (situacao: Acórdão Publicado - RE Pendente) — estado intermediário: a ficha já passou a "Trânsito em Julgado" (o outro item do 1304 recebeu baixa)

## Para a dona decidir (nada foi aplicado por isto)

1. **Tema 106 do STF, cancelado em 15/10/2026.** O STF cancelou o tema e manteve o julgamento de mérito de
   2020 (incompetência da Justiça do Trabalho depois da Lei 8.112/90; insubsistência do título antes dela). O
   verbete já não tinha tese (o STF a deixara para depois) e agora mostra "Cancelado" com a decisão literal, como os
   Temas 474 e 964, que o acervo mantém cancelados. **Recomendação: manter.** Alternativa: retirar o verbete (o
   estado da pessoa por esse id fica no disco, órfão, como nos retirados do L4).
2. **Tema 1016 do STF × Tema 369 do STJ.** O STF fixou a tese em 14/10/2026: é indevida a inclusão dos expurgos
   inflacionários na correção dos depósitos judiciais — no RE 1141156, interposto contra o REsp 1131360/RJ, que é o
   paradigma do Tema 369 do STJ ("A correção monetária dos depósitos judiciais deve incluir os expurgos")."
   O verbete do 1016 traz, na observação (caso c do L3), "Este verbete também cobre o Tema 369 (Repetitivo, STJ):
   tese oficial …". Agora as duas teses aparecem juntas e em sentidos opostos. **Recomendação: tirar essa
   observação** (o verbete passa a ser só o Tema 1016). A ficha do STJ segue "Acórdão Publicado - RE Pendente".
3. **Tema 50 do STJ.** O acervo só o tem pelo `COORD-REP-50`, com a tese de 2009 e a situação "Acórdão tornado
   sem efeito (13/11/2024)" (aviso de 03/10/2026). A Corte Especial julgou de novo em 15/09/2026 (acórdão publicado
   em 23/10/2026) e fixou tese nova. **Recomendação:** o `COORD-REP-50` passa a ser o verbete oficial do Tema 50 (id
   mantido, o estudo da pessoa fica), com a tese nova. Os dois itens do Tema 50 na Central só recebem baixa assim.
4. **Verbetes da compilação com texto que não é a tese oficial (23).** Não ganharam situação. Opções: trocar
   o texto pela tese oficial (como nos lotes L1–L4, id mantido) ou deixar como está.

   | Verbete | Tema | Situação no acervo → oficial | Texto × tese |
   |---|---|---|---|
   | `COORD-RG-1261` | STF 1261 | — → Trânsito em Julgado | difere |
   | `COORD-REP-50` | STJ 50 | Acórdão tornado sem efeito (13/11/2024) → Acórdão Publicado | difere |
   | `COORD-REP-57` | STJ 57 | — → Trânsito em Julgado | difere |
   | `COORD-REP-122` | STJ 122 | — → Trânsito em Julgado | difere |
   | `COORD-REP-146` | STJ 146 | — → Trânsito em Julgado | difere |
   | `COORD-REP-252` | STJ 252 | — → Trânsito em Julgado | difere |
   | `COORD-REP-282` | STJ 282 | — → Revisado | difere |
   | `COORD-REP-310` | STJ 310 | — → Trânsito em Julgado | difere |
   | `COORD-REP-324` | STJ 324 | — → Trânsito em Julgado | difere |
   | `COORD-REP-327` | STJ 327 | — → Trânsito em Julgado | difere |
   | `COORD-REP-328` | STJ 328 | — → Trânsito em Julgado | difere |
   | `COORD-REP-329` | STJ 329 | — → Trânsito em Julgado | difere |
   | `COORD-REP-330` | STJ 330 | — → Trânsito em Julgado | difere |
   | `COORD-REP-376` | STJ 376 | — → Trânsito em Julgado | difere |
   | `COORD-REP-566` | STJ 566 | — → Trânsito em Julgado | difere |
   | `COORD-REP-569` | STJ 569 | — → Trânsito em Julgado | difere |
   | `COORD-REP-570` | STJ 570 | — → Trânsito em Julgado | difere |
   | `COORD-REP-780` | STJ 780 | — → Trânsito em Julgado | difere |
   | `COORD-REP-886` | STJ 886 | — → Trânsito em Julgado | difere |
   | `COORD-REP-916` | STJ 916 | — → Trânsito em Julgado | difere |
   | `COORD-REP-990` | STJ 990 | — → Trânsito em Julgado | difere |
   | `COORD-REP-1030` | STJ 1030 | — → Trânsito em Julgado | difere |
   | `COORD-REP-1072` | STJ 1072 | — → Trânsito em Julgado | difere |

5. **Temas com tese oficial fora do acervo: 24 do STF e 87 do STJ** (mais 7 do STJ julgados com o
   acórdão por publicar). O registro oficial completo de cada um está em "sugeridos" (conferido na página do tema);
   para entrar, passa para "novos". A lista do acervo de RG tem só temas com repercussão geral reconhecida, por
   desenho.

   **STF**

   | Tema | Situação | Data | Título / questão |
   |---|---|---|---|
   | 18 | Trânsito em Julgado | 30/10/2014 | Fracionamento de execução contra a Fazenda Pública para pagamento de honorários advocatícios. |
   | 96 | Trânsito em Julgado | 19/04/2017 | Incidência de juros de mora no período compreendido entre a data da conta de liquidação e a expedição do requisitório. |
   | 216 | Trânsito em Julgado | 16/02/2011 | Incidência do ICMS sobre venda de veículos salvados de sinistros. |
   | 312 | Trânsito em Julgado | 19/04/2013 | Interpretação extensiva ao parágrafo único do art. 34 da Lei nº 10.741/2003 para fins do cálculo da renda familiar de… |
   | 380 | Trânsito em Julgado | 08/04/2011 | Aplicação do art. 17 do ADCT a vantagens protegidas pela garantia da coisa julgada |
   | 384 | Trânsito em Julgado | 27/04/2017 | Incidência do teto remuneratório a servidores já ocupantes de dois cargos públicos antes da vigência da Emenda… |
   | 498 | Trânsito em Julgado | 10/05/2017 | Alcance do direito sucessório em face de união estável homoafetiva. |
   | 630 | Trânsito em Julgado | 11/04/2024 | Inclusão da receita decorrente da locação de bens imóveis na base de cálculo da Contribuição ao PIS, tanto para as… |
   | 647 | Trânsito em Julgado | 17/05/2017 | Possibilidade da decretação de perdimento de bem apreendido em decorrência do tráfico ilícito de entorpecentes e drogas… |
   | 758 | Trânsito em Julgado | 07/12/2020 | Necessidade de condenação com trânsito em julgado para se considerar como falta grave, no âmbito administrativo… |
   | 885 | Trânsito em Julgado | 08/02/2023 | Efeitos das decisões do Supremo Tribunal Federal em controle difuso de constitucionalidade sobre a coisa julgada… |
   | 952 | Trânsito em Julgado | 25/09/2024 | Conflito entre a liberdade religiosa e o dever do Estado de assegurar prestações de saúde universais e igualitárias. |
   | 966 | Acórdão de mérito publicado | 25/03/2026 | Isonomia entre as carreiras da magistratura e do Ministério Público: direito dos juízes do Poder Judiciário da União à… |
   | 1048 | Trânsito em Julgado | 24/02/2021 | Inclusão do Imposto Sobre Circulação de Mercadorias e Serviços – ICMS na base de cálculo da Contribuição Previdenciária… |
   | 1071 | Mérito julgado | 30/09/2026 | Definição do termo “ingressado no serviço público”, à luz do art. 40, § 16, da Constituição Federal, para fins de… |
   | 1113 | Acórdão de mérito publicado | 28/09/2026 | Inclusão do valor da subvenção econômica da Lei 10.604/2002 na base de cálculo do ICMS sobre energia elétrica. |
   | 1253 | Trânsito em Julgado | 12/03/2026 | Opção provisória de nacionalidade brasileira de crianças adotadas no exterior por brasileiros. |
   | 1258 | Acórdão de mérito publicado | 08/09/2026 | Possibilidade de manutenção dos créditos de ICMS relativos às operações internas anteriores à operação interestadual… |
   | 1309 | Acórdão de mérito publicado | 02/09/2026 | Exigibilidade do PIS e da COFINS sobre as receitas financeiras oriundas de aplicações financeiras das reservas técnicas… |
   | 1412 | Mérito julgado | 19/08/2026 | Abrangência das medidas protetivas nas hipóteses de violência contra a mulher baseada no gênero, frente às obrigações… |
   | 1455 | Trânsito em Julgado | 06/08/2026 | Fixação por lei municipal, posterior à EC nº 29/2000, de alíquotas de IPTU em função da área do imóvel. |
   | 1456 | Acórdão de mérito publicado | — | Prazo prescricional para ações indenizatórias contra a União decorrentes da política de isolamento compulsório de… |
   | 1483 | Trânsito em Julgado | — | Redução dos prazos de validade do Certificado de Registro (CR) e do Certificado de Registro de Arma de Fogo (CRAF) pelo… |
   | 1486 | Trânsito em Julgado | — | Competência dos municípios para fixar jornada de trabalho superior à definida em legislação federal para… |

   **STJ**

   | Tema | Situação | Data | Título / questão |
   |---|---|---|---|
   | 25 | Trânsito em Julgado | 22/10/2008 | Discussão acerca dos juros remuneratórios em ações que digam respeito a contratos bancários. |
   | 30 | Trânsito em Julgado | 22/10/2008 | Discute matérias, quando ativadas em ações que digam respeito a contratos bancários: a) juros remuneratórios; b)… |
   | 31 | Trânsito em Julgado | 22/10/2008 | Discussão acerca da mora e da inscrição do nome do devedor em cadastros de proteção ao crédito em ações que digam… |
   | 32 | Trânsito em Julgado | 22/10/2008 | Discussão acerca da mora e da inscrição do nome do devedor em cadastros de proteção ao crédito em ações que digam… |
   | 33 | Trânsito em Julgado | 22/10/2008 | Discussão acerca da inscrição do nome do devedor em cadastros de proteção ao crédito em ações que digam respeito a… |
   | 37 | Trânsito em Julgado | 10/12/2008 | Discussão sobre indenização por danos morais decorrente de inscrição do nome do devedor nos cadastros de restrição ao… |
   | 51 | Acórdão Publicado | 15/09/2026 | Discussão sobre a necessidade de participação da Caixa Econômica Federal nos feitos que envolvam contratos de seguro… |
   | 65 | Acórdão Publicado - RE Pendente | 20/08/2026 | Questão referente ao empréstimo compulsório sobre energia elétrica, no qual se discute: a) prescrição - termo a quo; b)… |
   | 66 | Acórdão Publicado - RE Pendente | 20/08/2026 | Questão referente ao empréstimo compulsório sobre energia elétrica, no qual se discute: a) prescrição - termo a quo; b)… |
   | 96 | Trânsito em Julgado | 11/03/2009 | Questiona-se a responsabilidade dos sócios para responder por débitos da pessoa jurídica devedora em execução fiscal. |
   | 106 | Trânsito em Julgado | 25/04/2018 | Obrigatoriedade do poder público de fornecer medicamentos não incorporados em atos normativos do SUS. |
   | 132 | Trânsito em Julgado | 23/09/2009 | Questão referente à possibilidade de utilização de interpretação extensiva dos serviços bancários constantes da Lista… |
   | 144 | Trânsito em Julgado | 14/10/2009 | Questão referente à incidência do ICMS sobre produtos dados em bonificação. |
   | 153 | Trânsito em Julgado | 09/09/2009 | Questão referente ao reconhecimento da inexigibilidade da tarifa cobrada pelo fornecimento de água e tratamento de… |
   | 154 | Trânsito em Julgado | 09/09/2009 | Questão referente ao reconhecimento da inexigibilidade da tarifa cobrada pelo fornecimento de água e tratamento de… |
   | 186 | Trânsito em Julgado | 28/04/2010 | BENEFÍCIO CONCEDIDO ANTES DA CONSTITUIÇÃO FEDERAL VIGENTE. SALÁRIO-DE-CONTRIBUIÇÃO. CORREÇÃO MONETÁRIA. |
   | 187 | Trânsito em Julgado | 28/04/2010 | APOSENTADORIA POR INVALIDEZ. BENEFÍCIO CONCEDIDO ANTES DA CONSTITUIÇÃO FEDERAL VIGENTE. SALÁRIO-DE-CONTRIBUIÇÃO.… |
   | 189 | Trânsito em Julgado | 28/04/2010 | BENEFÍCIO CONCEDIDO ANTES DA CONSTITUIÇÃO FEDERAL VIGENTE. SALÁRIO-DE-CONTRIBUIÇÃO. CORREÇÃO MONETÁRIA. |
   | 204 | Trânsito em Julgado | 24/02/2010 | Discute-se a ilegitimidade passiva da Caixa Econômica Federal em ações ajuizada para requerer a aplicação dos índices… |
   | 212 | Trânsito em Julgado | 28/10/2009 | Questão referente à pretensão executória concernente aos honorários advocatícios de valor abaixo do estipulado no art.… |
   | 222 | Trânsito em Julgado | 02/12/2009 | Questão referente à impossibilidade de ajuizamento de ação própria pelo advogado da parte cujo pedido foi julgado… |
   | 251 | Trânsito em Julgado | 09/12/2009 | Questão referente à definição da natureza jurídica da remuneração cobrada pelo fornecimento de água e esgoto por… |
   | 297 | Trânsito em Julgado | 13/12/2010 | Questiona-se a inexistência do início de prova material a corroborar os testemunhos apresentados, impossibilitando,… |
   | 298 | Sobrestado | 25/08/2010 | Questão referente à legitimidade da instituição financeira em ações de cobrança de diferenças de correção monetária de… |
   | 299 | Sobrestado | 25/08/2010 | Questão referente à legitimidade da instituição financeira em ações de cobrança de diferenças de correção monetária de… |
   | 300 | Sobrestado | 25/08/2010 | Questão referente ao prazo prescricional prescrição aplicável para o ajuizamento de ações de cobrança de diferenças de… |
   | 301 | Sobrestado | 25/08/2010 | Questão referente ao índices aplicáveis para apuração de diferenças de correção monetária de valores depositados em… |
   | 302 | Sobrestado | 25/08/2010 | Questão referente aos índices aplicáveis para apuração de diferenças de correção monetária de valores depositados em… |
   | 369 | Acórdão Publicado - RE Pendente | 03/05/2017 | Questão referente aos índices de correção monetária aplicáveis aos depósitos judiciais. |
   | 438 | Trânsito em Julgado | 08/02/2012 | Discute-se presença de culpa exclusiva de terceiro como excludente de responsabilidade, o que importaria na não… |
   | 449 | Trânsito em Julgado | 10/08/2011 | Discute-se a verificação da incidência da regra prevista no art. 26, II, do Código de Defesa do Consumidor, à ação de… |
   | 463 | Trânsito em Julgado | 28/09/2011 | Discute-se a responsabilidade da instituição financeira que, recebendo título por endosso-mandato, leva-o indevidamente… |
   | 466 | Trânsito em Julgado | 24/08/2011 | Discute-se a responsabilidade civil de fornecedores de serviços ou produtos, por inclusão indevida do nome de… |
   | 486 | Trânsito em Julgado | 10/08/2011 | Discussão sobre a possibilidade de pagamento mediante a transformação em pagamento definitivo (conversão em renda) de… |
   | 487 | Trânsito em Julgado | 10/08/2011 | Discussão sobre a possibilidade de pagamento mediante a transformação em pagamento definitivo (conversão em renda) de… |
   | 488 | Trânsito em Julgado | 10/08/2011 | Discussão sobre a possibilidade de pagamento mediante a transformação em pagamento definitivo (conversão em renda) de… |
   | 517 | Trânsito em Julgado | 08/08/2012 | Discute-se a responsabilidade civil da concessionária de transporte ferroviário, por morte decorrente de atropelamento… |
   | 571 | Trânsito em Julgado | 12/09/2018 | Discute-se a sistemática para a contagem da prescrição intercorrente (prescrição após a propositura da ação) prevista… |
   | 675 | Trânsito em Julgado | 04/03/2015 | Discussão: (i) possibilidade de cancelamento da distribuição da impugnação ao cumprimento de sentença no caso de não… |
   | 681 | Trânsito em Julgado | 26/03/2014 | Questão referente à ação indenizatória por danos materiais e morais promovida por pescadores em razão de acidente… |
   | 683 | Trânsito em Julgado | 26/03/2014 | Questão referente à ação indenizatória por danos morais promovida por pescadores em razão de acidente ambiental… |
   | 703 | Trânsito em Julgado | 11/12/2013 | A falência da empresa executada fora decretada antes do ajuizamento da execução fiscal; a discussão é sobre a… |
   | 834 | Trânsito em Julgado | 26/03/2014 | Questão referente à ação indenizatória por danos materiais e morais promovida por pescadores em razão de acidente… |
   | 929 | Acórdão Publicado | 15/09/2026 | Discussão quanto às hipóteses de aplicação da repetição em dobro prevista no art. 42, parágrafo único, do CDC. |
   | 992 | Trânsito em Julgado | 13/06/2018 | É possível o cumprimento da medida socioeducativa até os 21 anos de idade, aplicada a adolescente em razão de fato… |
   | 1031 | Sobrestado | 09/12/2020 | Possibilidade de reconhecimento da especialidade da atividade de vigilante, exercida após a edição da Lei 9.032/1995 e… |
   | 1091 | Trânsito em Julgado | 08/06/2022 | Penhorabilidade (ou não) do bem de família de propriedade do fiador dado em garantia em contrato de locação comercial. |
   | 1119 | Trânsito em Julgado | 03/09/2026 | Aplicabilidade (ou não) do art. 39, inciso IX, do CDC à resilição unilateral de contrato de conta corrente bancária por… |
   | 1154 | Acórdão Publicado | 18/06/2026 | Isoladamente consideradas, a natureza e a quantidade do entorpecente apreendido, por si sós, não são suficientes para… |
   | 1177 | Acórdão Publicado | 20/08/2026 | Definir se é possível ou não a condenação da União ao pagamento de honorários de sucumbência em sede de ação civil… |
   | 1201 | Acórdão Publicado | 06/08/2025 | 1) Aplicabilidade da multa prevista no § 4º do art. 1.021 do CPC quando o acórdão recorrido baseia-se em precedente… |
   | 1211 | Acórdão Publicado | 08/10/2026 | Legalidade de cláusula contratual que estabeleça reajuste do prêmio de seguro de vida em grupo de acordo com a faixa… |
   | 1212 | Acórdão Publicado | 19/08/2026 | a) licitude da exigência, em estatuto social de cooperativa de trabalho médico, de aprovação em processo seletivo como… |
   | 1225 | Acórdão Publicado - RE Pendente | 15/09/2026 | I. Tema Principal: Possibilidade de redirecionamento da execução a pessoa jurídica de direito público, em razão da… |
   | 1228 | Acórdão Publicado | 20/08/2026 | Definir se a pessoa física que exerce serviço notarial ou registral é contribuinte da contribuição social do… |
   | 1230 | Acórdão Publicado | 15/09/2026 | Alcance da exceção prevista no § 2º do art. 833 do CPC, em relação à regra da impenhorabilidade da verba de natureza… |
   | 1241 | Acórdão Publicado | 18/06/2026 | Possibilidade de utilização da quantidade e variedade das drogas apreendidas para definir a fração da minorante do… |
   | 1250 | Acórdão Publicado | 19/08/2026 | Definir se é devida a condenação em honorários advocatícios sucumbenciais - em caso de acolhimento do incidente de… |
   | 1251 | Acórdão Publicado | 10/12/2025 | Definir o termo inicial dos juros de mora, nos casos em que reconhecido judicialmente o direito à indenização, por… |
   | 1260 | Acórdão Publicado | 12/08/2026 | Definir a) se, nos termos do art. 155 do CPP, a pronúncia não pode se fundamentar exclusivamente em elementos colhidos… |
   | 1276 | Acórdão Publicado | 09/09/2026 | Decidir sobre a possibilidade de exclusão da base de cálculo das contribuições ao PIS/PASEP e COFINS do montante da… |
   | 1280 | Acórdão Publicado | 19/08/2026 | Aplicabilidade do instituto jurídico do consumidor, por equiparação, às ações indenizatórias decorrentes do desastre… |
   | 1281 | Acórdão Publicado | 09/09/2026 | Possibilidade da aplicação do princípio da fungibilidade em apelação interposta contra ato judicial que julga a… |
   | 1285 | Acórdão Publicado | 21/10/2026 | Definir se é ou não impenhorável a quantia de até quarenta salários mínimos poupada, seja ela mantida em papel-moeda;… |
   | 1324 | Acórdão Publicado | 14/10/2026 | Definir a responsabilidade do alienante de veículo automotor por infrações administrativas e/ou de trânsito cometidas… |
   | 1327 | Acórdão Publicado | 09/09/2026 | Possibilidade de aplicação retroativa da Resolução ANTT 5.847/2019, por ser mais benéfica ao infrator, ainda que a… |
   | 1334 | Acórdão Publicado | 11/11/2026 | Definir se o vale-transporte pago em pecúnia integra a base de cálculo da contribuição para o FGTS. |
   | 1352 | Acórdão Publicado | 11/11/2026 | Definir se o direito à prorrogação do período de graça, decorrente da presença de mais de 120 (cento e vinte)… |
   | 1354 | Trânsito em Julgado | 18/06/2026 | Definir a possibilidade de aplicação retroativa da Lei n. 13.964/2019 (Pacote Anticrime) a cada condenação… |
   | 1357 | Acórdão Publicado | 18/06/2026 | Definir se é possível a concessão do benefício da remição penal, por aprovação no ENEM/ENCCEJA, quando o sentenciado… |
   | 1364 | Acórdão Publicado | 14/10/2026 | Possibilidade de apuração de créditos de PIS /COFINS em regime não cumulativo sobre o valor do ICMS incidente sobre a… |
   | 1372 | Acórdão Publicado | 20/08/2026 | Definir se a contribuição ao Programa de Integração Social (PIS) e a Contribuição para o Financiamento da Seguridade… |
   | 1374 | Acórdão Publicado | 12/08/2026 | Definir se o delito de associação para o tráfico de drogas (art. 35 da Lei n. 11.343/2006) equipara-se ou não ao crime… |
   | 1379 | Acórdão Publicado | 14/10/2026 | Deliberar acerca da incidência, ou não, de contribuição previdenciária e de terceiros no momento em que se exerce a… |
   | 1383 | Trânsito em Julgado | 12/08/2026 | Definir se é possível a penhora de pecúlio do condenado para pagamento de pena de multa, diante da alegação de… |
   | 1384 | Acórdão Publicado - RE Pendente | 09/09/2026 | Estabelecer se a União, o DNIT e/ou a ANTT devem obrigatoriamente participar de ações possessórias ajuizadas por… |
   | 1386 | Acórdão Publicado | 14/10/2026 | Definir se, nas hipóteses de indeferimento administrativo do pedido de pensão por morte de servidor público, o prazo… |
   | 1393 | Trânsito em Julgado | 20/08/2026 | Definir se é possível prosseguir a execução fiscal contra o espólio ou os sucessores caso o executado venha a falecer… |
   | 1399 | Acórdão Publicado | 09/09/2026 | Definir se, na execução individual de sentença coletiva, extinta em decorrência da desconstituição do título judicial… |
   | 1400 | Acórdão Publicado | 11/11/2026 | Definir se é possível, ou não, a admissibilidade de recurso especial que veicula discussão a respeito da existência de… |
   | 1406 | Trânsito em Julgado | 02/09/2026 | Definir se as Leis 11.775/2008, 12.716/2012, 12.844/2013, 13.001/2014, 13.340/2016, 13.306/2018, 13.606/2018 e… |
   | 1419 | Acórdão Publicado | 20/08/2026 | Definir se deve condenar ao pagamento de honorários advocatícios de sucumbência o acórdão que julga procedente a ação… |
   | 1424 | Trânsito em Julgado | 23/06/2026 | Definir se a mera apresentação de documentos que atestam a inatividade ou a queda de faturamento da pessoa jurídica - a… |
   | 1429 | Trânsito em Julgado | 20/08/2026 | 1. Definir qual das partes deve ser condenada ao pagamento dos ônus sucumbenciais quanto ao período em que o autor é… |
   | 1432 | Acórdão Publicado | 14/10/2026 | Definir o teor do conceito de contemporaneidade da avaliação para identificação do preço atual de mercado em ação… |
   | 1455 | Acórdão Publicado - RE Pendente | 09/09/2026 | Definir se a diferença entre o valor antecipado com base na multiplicação do preço de tabela por multiplicador ou… |
   | 1469 | Acórdão Publicado | 11/11/2026 | i) definir os conceitos de ações de educação, de saúde ou de assistência social para incidência da exceção contemplada… |

   **STJ — tese aguardando a publicação do acórdão**

   | Tema | Situação | Data | Título / questão |
   |---|---|---|---|
   | 1180 | Mérito Julgado | 04/11/2026 | Definir o marco inicial do prazo recursal nos casos de intimação eletrônica e de publicação no Diário da Justiça… |
   | 1243 | Mérito Julgado | 27/10/2026 | Necessidade (ou não) de prévio ajuizamento de execução fiscal ou de concretização da penhora para exercício do direito… |
   | 1322 | Mérito Julgado | — | Definir se é legal a remoção de professores integrantes da carreira do magistério superior federal entre instituições… |
   | 1403 | Mérito Julgado | 08/10/2026 | Definir o termo inicial da contagem do prazo para o Ministério Público impugnar decisão judicial proferida pelo… |
   | 1412 | Mérito Julgado | — | Definir se as bonificações/descontos compõem a base de cálculo do PIS/COFINS, nos termos do art. 1º, § 3º, V, a, das… |
   | 1423 | Mérito Julgado | 25/11/2026 | (In)admissibilidade de recurso especial interposto contra decisão monocrática de relator proferida em segunda instância. |
   | 1426 | Mérito Julgado | — | Definir se há possibilidade de complementação de valores no cumprimento de sentença contra a Fazenda Pública, relativos… |

