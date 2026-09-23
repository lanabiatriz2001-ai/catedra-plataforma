# Discursivas na prioridade — item 2

Decisões aprovadas pela dona em 23/09/2026: **ambos e fator próprio**.

- A disciplina declarada no banco preenche a correção. A pessoa pode substituí-la
  por uma matéria do edital antes de corrigir. Nomes compostos ou ambíguos não são
  divididos por suposição: a interface pede o vínculo com o edital ativo.
- A escolha acompanha o rascunho em `redDisciplina`, por área, e o registro em
  `redHist`/`red`. Registros antigos sem disciplina continuam intactos e neutros.
- `pDiscursiva` em Ajustes tem padrão 7 e faixa 0–10. Peso bruto 0,14, igual ao
  fator de questões antes da normalização; com os demais controles no padrão,
  corresponde a aproximadamente 12,3% da nota de prioridade de uma matéria com
  correção. Zero desliga o fator. Restaurar a seção também restaura esse controle.
- O sinal é `1 − média das notas normalizadas` das cinco tentativas válidas mais
  recentes da disciplina. A correção livre informa escala 0–10; a segunda fase
  transmite a disciplina e os pontos oficiais por quesito. Descontos e quesitos
  sem pontuação não ganham peso artificial. Tentativas com espelho sugerido não
  entram na régua.
- A normalização com o fator novo acontece somente nas disciplinas com nota válida.
  As outras preservam exatamente os pesos anteriores. Início e ciclo inteligente
  continuam consumindo `_prioridade()`; não existe uma segunda régua.
- Não são criadas novas revisões automáticas por esta mudança. Essa opção não foi
  aprovada junto das duas decisões.

## Persistência e testes

O antigo nome interno `redHist2` foi alinhado à chave existente `redHist`: o
autosave e a reidratação já percorriam `redHist`, mas não enxergavam o estado com
outro nome. Nenhuma migração ou exclusão de histórico é necessária. `redHist`
continua no merge por `id`/`up` de `auth.js`; o novo objeto de rascunho entra no
autosave e na reidratação genérica, sem nova lista de registros.

`tests/prioridade-discursiva.mjs` exercita a régua pura e o app real: fonte do
banco, escolha manual, correção, recarga, integração com o ciclo, controle de
Ajustes, merge e reidratação. Também verifica neutralidade sem dados, escala,
pesos por quesito, últimas cinco tentativas e controle desligado. É chamado
pelos runners Chromium e WebKit. `tests/regua-unica.mjs` permanece inalterado.
