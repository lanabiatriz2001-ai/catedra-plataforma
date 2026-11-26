# Fase Oral — sala de arguição

A preparação e a conversa têm hierarquias próprias. A entrada permite escolher carreira, disciplina, três/cinco/dez perguntas e três/cinco/dez minutos por resposta. As perguntas são sorteadas do acervo oficial existente. Lei seca, jurisprudência, perguntas avulsas e documentos continuam disponíveis para aprofundar o estudo.

Durante a sessão, a pergunta ocupa o centro da conversa. O relógio, a posição na fila, a resposta e os controles de pausa permanecem visíveis. As respostas anteriores podem ser consultadas sem revelar os padrões das próximas perguntas. A leitura usa a voz já oferecida pelo navegador ou pelo app; a resposta pode ser falada e registrada por escrita ou ditado do teclado.

O padrão oficial aparece depois de responder ou quando termina o tempo. A pessoa compara a própria resposta e se autoavalia. As respostas parciais e as dúvidas seguem pelo caminho existente de erros, cartões e revisões. Não há nota oficial nem avaliação automática nova.

## Preservação

O registro permanece em `sessions`, que já tem merge por `id` e `up`. `oralEstado` guarda fila, pergunta atual, tempo restante, resposta, respostas anteriores, etapa da comparação, área e conta. A retomada é explícita e começa pausada. A saída da tela pausa a conversa. Uma sessão apenas aberta, sem resposta ou tempo estudado, não protege a ofensiva do dia.

Os registros anteriores continuam legíveis. A gravação de uma sessão atualiza o mesmo registro e preserva seu instante de criação. A troca de área ou conta impede que uma resposta seja gravada no caderno errado. A sala não criou chave de armazenamento nem dependência; a gravação e a janela de 24 h, descritas abaixo, criaram uma chave e um banco local.

## Validação

`tests/oral-sala.mjs` cobre seleção de filtros e duração, fila sem repetição, retomada integral após fechamento, relógio pausado, histórico único, isolamento de conta e saída da tela. Mede contraste do texto da pergunta e dimensões dos controles em celular, iPad e desktop, nos dois temas. Perguntas e padrões longos verificam a permanência do relógio e o posicionamento da comparação, da próxima pergunta e do resultado final. `tests/oral-conversa.mjs` mantém os casos de voz, callbacks, respostas parciais, apagamento e troca de área. As suítes completas também verificam as fontes normativas em HTTP e `file://`.

## Gravação no aparelho e janela de 24 h (25/11/2026)

A lógica mora em `oral-gravacao.js` (testada em Node por `tests/oral-gravacao-24h.mjs`); o host só liga a tela. Sorteio, correção, "o que faltou" e voz ficaram como estavam.

Na sala, "Gravar resposta" usa MediaRecorder e `getUserMedia({audio:true})`, no formato que o `isTypeSupported` aceitar (audio/webm no Chrome, audio/mp4 no Safari). O áudio fica só no IndexedDB deste aparelho (`catedra-oral-gravacoes`, chave `sessão|pergunta`), nunca no localStorage, no sync ou na rede. Na correção, o tocador vem antes do padrão oficial, para ouvir enquanto se lê; ele também toca no histórico da arguição. Apagar a gravação, ou a arguição de vez (fora da lixeira), apaga o áudio. A gravação acompanha a conversa: pausa com ela e enquanto a banca lê a pergunta, e volta com a vez de responder. Se o gravador parar sozinho (limite, erro ou microfone interrompido), o trecho fica guardado e a tela diz por que parou. Limites: 10 min e 12 MB por resposta, 100 MB somando o aparelho. Sem gravador, com o microfone negado ou ausente, ou no app do Mac e do iPad (que ainda não pede o microfone), a tela mostra o motivo no lugar do botão; o microfone ocupado por outro app deixa o botão e pede para tentar de novo.

"Quando arguir: Em 24 horas" sorteia agora e guarda a fila em `catedra:oralJanela` (`{fila, sorteadoEm, liberaEm}`; caderno da área, autosave e sync). O sorteio segue a regra da sala (perguntas soltas, que podem vir de pontos e concursos diferentes), por isso a tela fala em "perguntas sorteadas", não em um ponto. Durante a janela aparecem a disciplina, o ponto e o concurso de cada pergunta, o programa publicado quando existe e a hora em que a arguição libera; o enunciado só aparece na sala. "Estudar o material" abre as fontes (jurisprudência ou lei seca), não as bancas reais. Passadas 24 h, a arguição usa exatamente a fila sorteada. Começar ou desistir grava um registro encerrado com conteúdo, porque no sync o vazio nunca apaga o cheio.
