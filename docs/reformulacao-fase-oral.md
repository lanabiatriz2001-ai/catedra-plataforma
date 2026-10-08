# Fase Oral — sala de arguição

A preparação e a conversa têm hierarquias próprias. A entrada permite escolher carreira, disciplina, três/cinco/dez perguntas e três/cinco/dez minutos por resposta. As perguntas são sorteadas do acervo oficial existente. Lei seca, jurisprudência, perguntas avulsas e documentos continuam disponíveis para aprofundar o estudo.

Durante a sessão, a pergunta ocupa o centro da conversa. O relógio, a posição na fila, a resposta e os controles de pausa permanecem visíveis. As respostas anteriores podem ser consultadas sem revelar os padrões das próximas perguntas. A leitura usa a voz já oferecida pelo navegador ou pelo app; a resposta pode ser falada e registrada por escrita ou ditado do teclado.

O padrão oficial aparece depois de responder ou quando termina o tempo. A pessoa compara a própria resposta e se autoavalia. As respostas parciais e as dúvidas seguem pelo caminho existente de erros, cartões e revisões. Não há nota oficial nem avaliação automática nova.

## Preservação

O registro permanece em `sessions`, que já tem merge por `id` e `up`. `oralEstado` guarda fila, pergunta atual, tempo restante, resposta, respostas anteriores, etapa da comparação, área e conta. A retomada é explícita e começa pausada. A saída da tela pausa a conversa. Uma sessão apenas aberta, sem resposta ou tempo estudado, não protege a ofensiva do dia.

Os registros anteriores continuam legíveis. A gravação de uma sessão atualiza o mesmo registro e preserva seu instante de criação. A troca de área ou conta impede que uma resposta seja gravada no caderno errado. Não há nova chave de armazenamento nem dependência.

## Validação

`tests/oral-sala.mjs` cobre seleção de filtros e duração, fila sem repetição, retomada integral após fechamento, relógio pausado, histórico único, isolamento de conta e saída da tela. Mede contraste do texto da pergunta e dimensões dos controles em celular, iPad e desktop, nos dois temas. Perguntas e padrões longos verificam a permanência do relógio e o posicionamento da comparação, da próxima pergunta e do resultado final. `tests/oral-conversa.mjs` mantém os casos de voz, callbacks, respostas parciais, apagamento e troca de área. As suítes completas também verificam as fontes normativas em HTTP e `file://`.
