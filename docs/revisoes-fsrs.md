# Revisões FSRS

O Cátedra usa FSRS-6 no baralho, na fila de revisões, nos casos, na leitura ativa, no Ciclo Magistratura e nas revisões nativas de LEGIS/JURIS. O motor funciona offline, com os 21 parâmetros padrão do ts-fsrs 5.4.2, retenção de 90% e agendamento diário sem aleatoriedade. Ainda não há otimização individual dos parâmetros.

As notas Errei, Difícil, Bom e Fácil alimentam estabilidade, dificuldade e o histórico real de respostas. O motor usa o tempo realmente decorrido desde a última resposta. Errei volta hoje; as outras notas calculam um intervalo de pelo menos um dia. O baralho mantém seus três botões: Não sei equivale a Errei, Sei a Bom e Fácil a Fácil.

Abrir uma revisão antiga mantém seu conteúdo, identidade e próxima data. Ao responder, a memória antiga é aproximada a partir do intervalo existente, sem inventar respostas passadas. O campo legado de facilidade permanece para compatibilidade. As bibliotecas nativas também preservam conteúdo, datas e falhas anteriores.

O Ciclo Magistratura cria uma única revisão para o dia seguinte ao fechamento de um assunto. Depois disso, a avaliação determina a próxima data pelo FSRS. As revisões antigas de 7/30/90 dias entram na fila comum pela primeira data ainda pendente, sem duplicação nem perda das etapas concluídas. Excluir uma revisão do ciclo remove também o vínculo antigo, para que a migração não a recrie.

## Verificação

- `tests/fsrs-motor.mjs`: 80 cenários comparados à referência oficial, resposta inicial, atraso, erro, migração, prévia e cache offline incompleto.
- `tests/fsrs-revisoes.mjs`: sessão real, persistência ao recarregar, migração do ciclo e exclusão sem recriar.
- `node tests/fsrs-swift.mjs`: compila o motor Swift utilizado nos apps e confere os mesmos 80 cenários no Mac.

As fórmulas e os parâmetros têm origem no [ts-fsrs 5.4.2](https://github.com/open-spaced-repetition/ts-fsrs/tree/v5.4.2). A licença MIT acompanha `fsrs.js`; o motor Swift em `ios/vendor/design/FSRS.swift` é compartilhado pelos builds do Mac e do iPad.
