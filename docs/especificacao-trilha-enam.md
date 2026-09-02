# Especificação — Trilha ENAM (simulado no formato da prova, meta de corte e contagem regressiva)

*Escrita em 02/09/2026 no padrão de `docs/especificacao-melhorias.md`. As **Regras da casa**
valem inteiras: `_autosaveKeys()`, `ARRAY_ID` + `id`/`up`, listas de cópia do build, casos
em `tests/run.mjs`, nada de rede externa em runtime. Fonte normativa deste documento:
**Edital de Abertura n. 02/2026 — 6º Exame Nacional da Magistratura (FGV/ENFAM)**, itens
citados a cada regra; nenhum número aqui foi inventado.*

## O que o edital manda (e o app passa a saber)

| Regra | Valor | Fonte |
|---|---|---|
| Data e horário | 29/11/2026, das 13h às 18h (horário de Brasília) — **5 horas** | Edital 02/2026, item 8.1 |
| Formato | 80 questões de múltipla escolha, **5 alternativas** (A–E), uma correta | item 8.5 |
| Distribuição | Constitucional 16 · Administrativo 10 · Noções Gerais de Direito e Formação Humanística 6 · Direitos Humanos 6 · Processual Civil 12 · Civil 12 · Empresarial 6 · Penal 12 | item 8.6 |
| Habilitação | ≥ 70% = **56 acertos**; ≥ 50% = **40 acertos** para pessoas autodeclaradas negras, indígenas, quilombolas ou com deficiência | itens 3.7 e 9.2 |
| Natureza | eliminatório, não classificatório | item 1.2.1 |
| Validade | certificado válido por 2 anos, prorrogável uma vez | item 1.3 |
| Questão anulada/rasurada | nota zero à questão com mais de uma ou nenhuma marcação | item 8.9 |

Observação de fuso: a Lana está em Porto Velho (UTC−4). A prova começa às **12h locais**.
Toda contagem regressiva e todo cronômetro deste documento usam o horário de Brasília
explicitamente (`America/Sao_Paulo`), nunca o relógio local sem rótulo.

---

## E1. Calendário ENAM, meta de acertos e contagem regressiva

**Objetivo.** O app sabe quando é o ENAM e qual é a meta da pessoa, e mostra isso onde ela
decide o dia: chip no Início e régua no Edital/Reta final.

**O que já existe.**
- Data da prova principal em `localStorage['catedra:prova']` → `state.provaData`
  (Catedra.dc.html ~linha 6080); cálculo de dias em ~6692 e ~9088; **Reta final**
  (`retaFinal`, `retaFinalCom` 15/30/45/60 dias, `retaDias`) liga a partir dela.
- Componente **Régua** (`.ct-regua`, DESIGN.md — "só entra onde o prazo *é* o critério:
  Edital e Reta final") e o chip de contagem regressiva do Início ("Mostrar a contagem
  regressiva da prova", em Ajustes).
- Modelo de edital ENAM já pronto para importar (`modelos-edital.js`, id `enam`: 8
  disciplinas, 134 tópicos, 798 subtópicos).

**O que construir.**
1. Chave nova `catedra:enam` (objeto escalar — coberto pelo carimbo por chave, sem
   `ARRAY_ID`; **registrar `enam` em `_autosaveKeys`**):
   ```js
   { edicao:'2026.2', data:'2026-11-29', inicio:'13:00', fuso:'America/Sao_Paulo',
     duracaoMin:300, metaAcertos:56,          // 56 ou 40 — só o número, nunca o motivo
     ativo:true, up:1756800000000 }
   ```
   Edições futuras entram como constante em `enam.js` (E2) com data e edital; a pessoa
   escolhe a edição em Ajustes → "ENAM".
2. **Meta de acertos** em Ajustes: dois botões neutros — "56 acertos (70%)" e
   "40 acertos (50%)" — com a nota "o edital define os dois cortes (itens 3.7 e 9.2);
   escolha o que vale para você". **Não** perguntar raça, etnia ou deficiência: são dados
   sensíveis (LGPD, art. 5º, II) e a plataforma não coleta condição pessoal; guardar só o
   número.
3. Chip no Início: "ENAM 2026.2 · faltam N dias" (dias inteiros até 29/11 em Brasília),
   com o segundo texto "prova às 13h de Brasília · 12h em Porto Velho" derivado de
   `Intl.DateTimeFormat` com o fuso do aparelho. Abaixo de 7 dias, o chip vira "faltam N
   dias · último simulado há X dias".
4. Régua do Edital/Reta final passa a aceitar **duas datas** (prova principal e ENAM);
   a mais próxima manda na Reta final, a outra aparece como marco menor.
5. `CT_ENAM.diasAte(dataISO, agora, fuso)` e `CT_ENAM.cadencia(agora, data)` (E5) em
   `enam.js` — funções puras.

**Aceite.** Em 02/09/2026 o chip mostra "faltam 88 dias"; em 28/11 à noite em Porto Velho
mostra "falta 1 dia" e "12h em Porto Velho". Trocar a meta muda só `metaAcertos`. Sem
`catedra:enam`, nada aparece (estado vazio convida: "Vai fazer o ENAM? Ative a trilha").

**Armadilhas.** `new Date('2026-11-29')` é UTC — usar `Date.UTC` com o deslocamento de
Brasília ou `Intl` com `timeZone`; testar a virada de dia em UTC−4. Não reaproveitar
`catedra:prova` para o ENAM: a pessoa pode ter concurso estadual e ENAM no mesmo semestre.

---

## E2. Banco ENAM oficial (questões das provas anteriores)

**Objetivo.** Um simulado no formato exige 80 questões A–E com a distribuição do edital. As
83 questões de `questoes-prova.js` não bastam e vêm do TEC. A fonte certa são as **provas e
gabaritos oficiais** que a FGV/ENFAM publicam a cada edição: cinco edições × 80 = **400
questões reais do próprio ENAM**.

**O que já existe.**
- Pipeline de provas: `scripts/build-questoes-prova.mjs` → `questoes-prova.js`
  (`window.CT_QUESTOES_PROVA`, shape `{id, banca, ano, orgao, cargo, disciplina, assunto,
  enunciado, alternativas:[{letra,texto}], gabarito, pct}`); `scripts/extrair_prova.py`
  (PDF → texto); régua de qualidade `scripts/qualidade-texto.mjs` (mojibake, itens
  colados); `scripts/auditar-provas.mjs`.
- O simulado consome `CT_QUESTOES_PROVA` por `CT_TREINO.acervoQuestoesProva()` e
  `sortearQuestoesProva(n, ramos)`; o item de prova real vira
  `{id:'qp'+…, origem:'prova', ramo, enunciado, alternativas, certo:gabarito, …}`
  (`iniciarSj`, ~linha 9868).
- Princípio 1 do PRODUCT.md: só entra o que veio de fonte primária verificada.

**O que construir.**
1. `scripts/build-questoes-enam.mjs` → `questoes-enam.js` (`window.CT_QUESTOES_ENAM`,
   gerado, não editar à mão) a partir dos PDFs oficiais de **prova** e **gabarito
   definitivo** das edições I (abr/2024), II (out/2024), III (mai/2025), IV (out/2025) e
   V (jun/2026), baixados uma vez para `scripts/fontes/enam/` (documentos públicos de órgão
   público; citar edição e URL da FGV/ENFAM no cabeçalho do arquivo gerado). Depois de
   29/11/2026, a edição VI entra pelo mesmo script.
2. Shape por questão (compatível com `CT_QUESTOES_PROVA` + campos próprios):
   ```js
   { id:'enam-2026.1-037', edicao:'2026.1', numero:37,
     area:'civil',                      // uma das 8 áreas do quadro 8.6 (id curto)
     disciplina:'Direito Civil',        // nome como no edital/app
     enunciado:'…', alternativas:[{letra:'A',texto:'…'},…5], gabarito:'C',
     anulada:false,                     // questão anulada no gabarito definitivo
     fonte:'FGV — ENAM 2026.1, prova tipo 1, gabarito definitivo' }
   ```
   Área vem do **bloco da prova** (a prova oficial é organizada por disciplina, com
   cabeçalho) — o script lê o cabeçalho, não adivinha pelo texto. Constante única
   `CT_ENAM.AREAS` (em `enam.js`) com `{id, nome, cota, disciplinasApp:[…]}` para as 8
   áreas: `constitucional` 16 (`Direito Constitucional`, `Direito Constitucional do
   Trabalho`, `Direito Tributário` constitucional, `Normas Constitucionais de Processo
   Penal` — item 8.6, nota da linha), `administrativo` 10, `humanistica` 6 (`Noções Gerais
   de Direito e Formação Humanística`), `dh` 6 (`Direitos Humanos`), `processocivil` 12,
   `civil` 12, `empresarial` 6, `penal` 12.
3. Portão de qualidade no build (padrão do pente-fino de 27/08): abortar se alguma edição
   fechar com ≠ 80 questões, se houver `id` duplicado, se alguma questão tiver ≠ 5
   alternativas, se o gabarito não estiver em A–E, ou se a régua de mojibake acusar.
   Questão anulada fica no banco com `anulada:true` e **nunca** entra em simulado.
4. Build: `./questoes-enam.js` entra em `scripts/build.mjs` na lista **sob pedido**
   (é carregado só quando o modo ENAM abre, como `questoes-prova.js`) e em
   `build-macos.mjs`; `treino.js` ganha `acervoQuestoesEnam()` (mesmo padrão de
   `acervoQuestoesProva`).
5. Comentário das questões: **não** copiar comentário de terceiros (TEC/QC/cursos — obra
   protegida, Lei 9.610/1998, art. 7º). O gabarito comentado do modo ENAM mostra o
   dispositivo/verbete de referência quando o script conseguir apontá-lo (regex de "art.",
   "Súmula", "Tema") e, em degrau 2, um comentário próprio curto por questão.

**Aceite.** `node scripts/build-questoes-enam.mjs` gera 400 questões (5 × 80), 8 áreas
com as cotas certas em cada edição (16/10/6/6/12/12/6/12), zero anuladas no sorteio,
`npm test` verde com os casos de E6. O arquivo abre offline nos três alvos.

**Armadilhas.** PDFs da FGV vêm por **tipo de prova** (ordem embaralhada): usar sempre o
tipo 1 e o gabarito do tipo 1. Item 8.6 mudou entre edições? Conferir o quadro de cada
edital antes de fixar `cota` por edição — se mudou, `CT_ENAM.AREAS` guarda a cota **por
edição**. Extração de texto quebra em tabelas e colunas: a régua de qualidade é obrigatória,
e enunciado com < 40 caracteres ou alternativa vazia aborta o build.

---

## E3. Simulado ENAM no formato da prova

**Objetivo.** Um botão "Simulado ENAM" monta a prova como ela é: 80 questões A–E na ordem
das áreas do edital, 5 horas de cronômetro, correção só no fim, e a pessoa pode fechar o
app e voltar sem perder a prova.

**O que já existe.**
- **Simulado A–E** (`sj*`): montagem em `iniciarSj` (itens C/E de lei e jurisprudência
  via `CT_TREINO.simuladoMisto` + questões de prova real como bloco final), resposta
  `responderSjAlt` (`data-l`), navegação `sjAtual`, fim `sjFim`, relatório `sjRel` via
  `CT_TREINO.relatorio(itens, respostas)` (por ramo, por origem, pegadinhas, erradas),
  botão "Praticar" externo (`plataformas-questoes.js`).
- **Prova cronometrada** (`provaMode`, `provaDurationMin` padrão 240, `startProva`,
  `provaToggle`, `finishProva`, `exitProva`, ~linhas 11134–11146) com persistência em
  `localStorage['ct_prova']` (`_saveProva`/`_restoreProva`: sobrevive a fechar o app;
  prova de outro dia é descartada de propósito, ~linha 14386) e `finishProva` abrindo o
  registro de sessão.
- O `Esc` e o modo foco já sabem que `provaMode` é um modal opaco (`_ocupado`, ~6135).

**O que construir.**
1. Preset **"Modo ENAM"** no cabeçalho do Simulado (chip ao lado de "Simulado A–E"):
   monta com `CT_ENAM.montar(banco, {cotas, excluir:idsJaFeitos})`:
   - 80 questões, **só** `CT_QUESTOES_ENAM` não anuladas, sorteadas por área na cota do
     item 8.6, **na ordem das áreas do edital** (como a prova real), embaralhadas dentro
     do bloco; prioriza questões que a pessoa ainda não fez (`catedra:enamSim` guarda os
     ids usados); quando a área não tem estoque suficiente, completa com
     `CT_QUESTOES_PROVA` da mesma `disciplinasApp` marcada `foraDoEnam:true` (aviso no
     item e no relatório); **nunca** completa com itens C/E gerados;
   - cronômetro de **300 min** reaproveitando `provaMode` (`startProva` com
     `provaDurationMin=300`, `provaName:'ENAM 2026.2 · simulado'`), sem pausa por padrão
     (a prova real não tem); "Pausar" existe, mas marca a tentativa `comPausa:true`;
   - persistência: além de `ct_prova`, gravar `ct_enam_prova` `{itensIds, resp, atual,
     ini}` para reabrir **a mesma prova** (a regra "prova de outro dia é descartada" não
     vale aqui: a pessoa pode começar à noite e terminar de manhã; guardar até 36 h);
   - tela: grade de 80 quadradinhos (`.ct-gab`) com estados respondida / em branco /
     marcada para rever (`data-rev`), navegação livre, "Em branco" explícito, sem correção
     imediata e sem gabarito antes de "Encerrar e corrigir"; contador de tempo em `--mono`
     (DESIGN.md), aviso discreto aos 60 e 15 minutos finais (sem som, sem cor de perigo
     piscando).
2. Encerrar → `CT_ENAM.corrigir(itens, resp, meta)` (E4) e `finishProva` como hoje
   (registro de sessão pré-preenchido: categoria `Simulado`, minutos reais, `disc`
   "ENAM").
3. Acessibilidade: teclado `A`–`E` responde, `←/→` navegam, `R` marca para rever;
   alvos ≥ 44px; `prefers-reduced-motion` sem transição na grade.

**Aceite.** "Modo ENAM" monta 80 questões com 16 de Constitucional na frente e 12 de
Penal no fim; fechar o app aos 40 minutos e reabrir devolve a mesma prova, com o mesmo
tempo restante; ao encerrar, o relatório de E4 aparece e a sessão é registrada. Sem
`questoes-enam.js` publicado, o botão explica o que falta em vez de montar C/E.

**Armadilhas.** `ct_prova` hoje descarta prova de outro dia — não mexer nessa regra para
o simulado comum; a exceção é só do `ct_enam_prova`. 80 itens em `state.sjItens` com
`alternativas` cabem em memória, mas **não** gravar enunciados em `catedra:enamSim` (só
ids e respostas). Anulada no gabarito definitivo nunca conta nem para acerto nem para erro.

---

## E4. Correção ENAM: habilitação, déficit por área, erros que viram revisão

**Objetivo.** O relatório responde à única pergunta que importa — *habilitaria?* — e diz
onde faltou, em número de questões, área por área.

**O que já existe.**
- `CT_TREINO.relatorio` devolve total/acertos/brancos/pct, `ramos` ordenados do pior ao
  melhor, `pegadinhas`, `erradas`.
- Canal "erro vira revisão sozinho" (especificação anterior, item 2): questão errada →
  `catedra:errors` + flashcard pergunta→fundamento, dedupe por hash do enunciado em 30
  dias, toast com desfazer.
- `catedra:redHist` mostra o padrão de histórico de tentativas com sparkline SVG inline.

**O que construir.**
1. `CT_ENAM.corrigir(itens, resp, meta)` (função pura) →
   ```js
   { acertos:51, brancos:4, erros:25, meta:56, habilitaria:false, margem:-5,
     porArea:[{ area:'constitucional', cota:16, ok:9, pct:56,
                alvo:11.2,            // cota × (meta/80): quanto essa área "deveria" render
                deficit:2.2 }, …],    // ordenado pelo maior déficit
     tempoTotalSeg:16920, segPorQuestao:211, comPausa:false, foraDoEnam:0 }
   ```
   `alvo` é proporcional: com meta 56, cada área precisa render 70% da sua cota; com 40,
   50%. O relatório mostra `ok/cota` e o alvo arredondado ("9 de 16 · alvo 11").
2. Tela de resultado: número grande `acertos/80` em `--display`, selo "habilitaria"
   (`--ok`) ou "faltaram N acertos" (`--warn`; **não** `--danger` — é treino), barras por
   área na ordem do edital (preenchimento = `ok/cota`, marca vertical no `alvo`), tempo
   médio por questão vs. 225 s disponíveis (18.000 s ÷ 80), e "onde faltou": as 3 áreas de
   maior déficit com botão **"Estudar esta área"** → abre o LEGIS nas leis da área
   (`ctAbrirAcervo`) e, quando existir, a **leitura ativa** (especificação irmã) dos
   dispositivos mais cobrados.
3. Erros → mesmo canal do item 2: `catedra:errors` (`disc` = disciplina da questão,
   `fonte:'enam'`, `ref` = `edicao·numero`) e flashcard `enunciado → gabarito + referência`,
   teto de 20 por correção, dedupe por hash; toast com desfazer.
4. Histórico: chave nova `catedra:enamSim` (**array; registrar em `_autosaveKeys` e em
   `ARRAY_ID`**): `{id:'enam'+ts, up, quando, edicaoBanco:['2024.1','2025.1'],
   meta, acertos, brancos, porArea:[{area, ok, cota}], tempoTotalSeg, comPausa,
   foraDoEnam, idsUsados:[…80]}` — sem enunciados.
5. Gabarito comentado: para cada questão, a referência normativa apontada pelo build (E2.5)
   e o botão "Ler no LEGIS"/"Ver no JURIS" pelo canal existente.

**Aceite.** 51 acertos com meta 56 → "faltaram 5", três áreas com déficit no topo; com
meta 40 a mesma prova → "habilitaria" com margem +11. 25 erros geram até 20 itens (aviso
dos 5 restantes) e "desfazer" remove o lote. O histórico sincroniza entre aparelhos.

**Armadilhas.** Não chamar de "aprovação": o ENAM habilita (item 1.2.1) — o texto da tela
é "habilitaria". Percentuais por área com cota 6 oscilam muito: mostrar `ok/cota`, não só
`%`. Tempo médio só das respondidas.

---

## E5. Painel da trilha ENAM

**Objetivo.** Um lugar que junta calendário, meta, tentativas e o que fazer nesta semana —
a "trilha" que o mercado não tem como ferramenta.

**O que já existe.**
- Início modular em blocos; bloco de prioridade (`prioridade-calc.js`) com "porquê"
  visível; Reta final com três tarefas; agenda/ciclo aceitam itens manuais
  (`catedra:eventos`, `manualFixed`).
- Modelo de edital `enam` importável; progresso do edital (`edPct`, `edDone/edTotal`).

**O que construir.**
1. Bloco **"Trilha ENAM"** no Início (só com `catedra:enam.ativo`): contagem regressiva
   (E1), meta, última tentativa (acertos/80 e "habilitaria?"), sparkline das tentativas
   (SVG inline, padrão do `redHist`), e as 8 áreas em uma linha com `ok/cota` da última
   prova (cor de matéria do edital como identidade, texto escurecido).
2. **Cadência**: `CT_ENAM.cadencia(agora, data)` sugere um simulado completo a cada 14
   dias até 29/11 (em 02/09: 6 simulados, o último em 22/11) e gera a lista de datas;
   botão "Colocar na agenda" cria `catedra:eventos` (5 h, sábado ou domingo mais próximo,
   editável). Depois de cada tentativa, a próxima ação do bloco muda: "revisar os 25
   erros" (abre Revisar agora) → "estudar Constitucional" (déficit) → "próximo simulado
   em 14/09".
3. "Importar o edital ENAM" quando `catedra:edital` não tiver as 8 disciplinas
   (`modelos-edital.js` id `enam`) — a régua de conclusão do edital vira a segunda métrica
   da trilha.
4. Estado vazio (PRODUCT.md exige): sem tentativa, o bloco mostra o formato da prova (80 ·
   5 h · 56/40), a data e o botão "Fazer o primeiro simulado" — nunca zeros.

**Aceite.** Em 02/09 o bloco lista 6 datas de simulado; após uma tentativa, mostra o
resultado e a próxima ação correta; sem `enam.ativo`, o bloco não existe. Nada exige rede.

**Armadilhas.** Cadência é sugestão, não cobrança: sem "atrasado" em `--danger`, sem
ofensiva. Se `provaData` (concurso estadual) estiver a menos de 30 dias, a Reta final manda
e a trilha ENAM recua para "sem simulado nesta semana".

---

## E6. Testes, build e acessibilidade

1. `enam.js` (funções puras, `window.CT_ENAM`) entra na lista `casca` de `build.mjs` e
   nas listas de `build-macos.mjs`; `questoes-enam.js` na lista **sob pedido**.
2. `tests/harness-enam.html` + casos em `tests/run.mjs` (prefixo `ENAM`):
   - `montar`: banco sintético com 8 áreas → 80 itens nas cotas exatas, na ordem do
     edital, sem anuladas, sem repetir `idsUsados` enquanto houver estoque; com estoque
     curto em `empresarial`, completa da mesma disciplina marcado `foraDoEnam` e **nunca**
     com C/E;
   - `corrigir`: 51/80 com meta 56 → `habilitaria:false, margem:-5`; 51/80 com meta 40 →
     `true, +11`; anulada não conta; `alvo` por área = cota × meta/80;
   - `diasAte`: 2026-09-02 (UTC−4, 23h30) → 88; 2026-11-28 23h30 em Porto Velho → 1;
   - `cadencia`: de 02/09 a 29/11 → 6 datas, a última ≥ 7 dias antes da prova;
   - persistência: iniciar Modo ENAM, responder 3, recarregar → mesma prova, mesmas 3
     respostas, tempo restante ≤ inicial; `exitProva` limpa `ct_enam_prova`;
   - erros → `catedra:errors`/`catedra:fc` com teto 20 e desfazer;
   - build: `build-questoes-enam.mjs` com PDF de amostra em `tests/` aborta em cota
     errada e em 4 alternativas.
3. WebKit: o roteiro `tests/run-webkit.mjs` ganha "abrir Modo ENAM e responder 1 questão"
   (a grade de 80 quadradinhos é o tipo de tela que quebra em WKWebView).
4. A11y: teclado completo, alvos 44px, contraste dos textos por área ≥ 4,5:1 (cor de
   matéria escurecida — DESIGN.md), `prefers-reduced-motion`, sem som.

## Ordem sugerida

`E2 (script + banco) → E1 → E3 → E4 → E5 → E6 junto de cada PR`. O banco é o
pré-requisito de tudo e pode andar já (documentos públicos, sem anti-bot); E1 é pequeno e
já dá valor visível; E3+E4 fecham o simulado; E5 é a trilha. Estimativa honesta: E2 2–3
dias (extração de 5 provas com portão de qualidade); E1 meio dia; E3 2 dias; E4 1 dia;
E5 1–2 dias.

## Fora de escopo (decidido, com razão)

- **Questões do TEC/QC como fonte do banco ENAM**: dependência de terceiro, anti-bot e
  risco de origem — o banco nasce dos PDFs oficiais (Lei 9.610/1998, art. 8º, IV).
- **Comentário por IA em massa**: comentário é obra própria; entra por degrau, revisado.
- **Ranking entre pessoas no ENAM**: a Comunidade já tem ranking por tempo; nota de
  simulado não vira ranking (pressão sem ganho pedagógico).
- **Autodeclaração de cota**: a meta é um número escolhido pela pessoa; a plataforma não
  registra nem infere raça, etnia ou deficiência.

## Riscos

- **Publicação das provas**: a FGV publica prova e gabarito; se um PDF sair do ar, o
  script usa a cópia em `scripts/fontes/enam/` (versionada) — nunca depende de rede em
  runtime.
- **Mudança de quadro 8.6 em edição futura**: cotas por edição em `CT_ENAM.AREAS`; o
  build aborta se a soma ≠ 80.
- **Confusão de fuso**: todo horário rotulado; testes na virada de dia em UTC−4.
