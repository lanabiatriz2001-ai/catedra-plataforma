# Validação do modo OAB

O percurso mantém o edital e o progresso separados por fase e área de segunda fase. Guardar por hoje registra os minutos sem avançar a atividade; concluir registra um retrato do treino e abre a próxima atividade. Sessões, revisões e cartões continuam integrados à plataforma, com caderno separado da Magistratura.

## Correção da retomada

A falha da CI foi reproduzida no navegador local com fuso UTC. O plano salvo mantinha fase 2, Penal e a atividade da peça, mas a tela ficava vazia: a notificação de uma revisão atrasada chamava `disc.replace()` em um registro antigo sem `disc`. A exibição agora aceita esse campo ausente, sem modificar o registro. O teste de retomada permanece exigindo respostas, histórico, revisões, cartões, sessões e resumo do widget preservados.

## Verificações locais

- `tests/modo-oab.mjs`: Chromium e WebKit, com fuso UTC; isolamento dos cadernos, sete áreas, editais por fase, pausa e conclusão, rascunhos, recarga, categorias de sessão, guardas de fase/conta e histórico sincronizado.
- `tests/oab-interface.mjs`: Chromium e WebKit; revisões atrasadas com e sem matéria, histórico aberto, temas claro/escuro e larguras de 390 e 1280 px. Contraste mínimo medido: **4,8876:1**; controles com largura e altura mínimas de **44 px**; ausência de rolagem horizontal. O botão primário é medido contra as duas pontas do gradiente. A medição espera a transição de tema terminar.
- Sentinela D16 existente: passou sem alterações nas assertivas.
- Menu separado: testes `menu-fases` e `menu-lateral` passaram nos dois motores. Foi removida a chave `navStyle.simulados` que deixou de ser usada pelo template.

As capturas usam o viewport real, com a rolagem do conteúdo nas posições de início, resposta e registro. Nenhuma imagem foi editada.

A suíte completa da CI e a instalação nativa pertencem à entrega coordenada. Resultados locais não comprovam instalação do modo OAB.
