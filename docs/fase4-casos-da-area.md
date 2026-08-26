# Fase 4 — jornadas verticais por área

**Situação: parcialmente concluída.** A estrutura, os bloqueios por capacidade e os
estados "em preparo" estão prontos e em produção. **Continua pendente o acervo vertical
real** — casos, questões e material editorial de cada área. Este documento existe para
que ninguém leia o que foi entregue como se fosse a fase inteira.

## O impasse, e como ele foi resolvido

A primeira leitura da Fase 4 supunha acervo editorial próprio: casos clínicos e
socioassistenciais escritos, revisados e com direito de uso. Isso é trabalho editorial, não
de software, e inventá-lo seria pior do que não ter — conteúdo clínico inventado é
perigoso, e "conteúdo jurídico adaptado" para Saúde é falso por construção.

A redefinição desfaz o impasse sem baixar a régua: **o acervo é da pessoa; a estrutura é
da área.** Quem estuda Medicina discute caso clínico na enfermaria todo dia; quem estuda
Serviço Social atende caso no CRAS. O que faltava não era o caso — era onde guardá-lo com
forma, treinar em cima e revisar no tempo certo.

## O que foi entregue

**`casos.js`** — o esquema de cada área e a validação. Não traz conteúdo nenhum.

| | Saúde e Medicina | Assistência Social |
|---|---|---|
| nome | Caso clínico | Caso socioassistencial |
| campos | apresentação · achados · avaliação · conduta · evolução · fonte | contexto familiar e territorial · demanda · vulnerabilidades · avaliação técnica · intervenção · rede acionada · encaminhamentos · acompanhamento · fundamento |
| ordem | a do raciocínio clínico | a do trabalho social |

São **dois esquemas diferentes**, de propósito: 7 campos contra 10, em ordens que não se
correspondem. `esquema('juridica')` devolve `null` — não existe caminho pelo qual o
formulário jurídico seja reaproveitado, e o teste `FASE4 juridicaNaoTemEsquema` trava isso.

**Nada identificável.** Um caso nasce de gente real; guardar CPF, cartão do SUS, telefone,
endereço ou data de nascimento aqui transformaria um caderno de estudo em prontuário
clandestino. `acharIdentificaveis()` **bloqueia o salvamento** (não é aviso que dá para
ignorar), diz em que campo está e o que é, e sugere a forma certa — "homem, 54 anos" no
lugar do nome.

Nome próprio **não** entra na lista de bloqueio: distinguir "Maria" de "doença de Crohn"
sem errar muito é impossível, e um bloqueio que erra muito ensina a pessoa a ignorá-lo. Para
nome, quem orienta é a estrutura e a dica de cada campo.

**Privado por padrão.** O caso mora em `catedra:casos@saude` / `catedra:casos@social` — o
caderno daquela área, na conta da pessoa. Entra no backup e na sincronização da própria
conta e **não tem afordância de compartilhamento**: não existe botão, rota ou campo que
mande um caso para grupo, comunidade ou outra pessoa.

**Treino, revisão e acompanhamento.** O caso se revela por etapas, na ordem do esquema —
você lê a apresentação, tenta responder as perguntas que você mesma cadastrou, e só então
vê o resto. A autoavaliação no fim alimenta o **mesmo motor SM-2** do resto do app: o caso
passa a aparecer em Revisões no dia certo, ao lado de tudo o mais. O painel conta quantos
casos existem, quantos já foram treinados e quando foi o último.

**Capacidade, não `if (area === …)`.** `casosProprios` é `true` só onde há esquema; a view
`casos` entra em `VIEW_EXIGE`, então o bloqueio vale para o menu, para o deep link e para
`window.__catedraGoView` — em Jurídica a tela não abre e a pessoa lê por quê.

## O que continua pendente

- **Acervo editorial vertical** — casos, questões e material por especialidade, com fonte e
  direito de uso. É o que os textos de "em preparo" das áreas continuam prometendo, e eles
  foram reescritos para prometer exatamente isso e nada além.
- **Escrita técnica em Assistência Social** (relatório, parecer, estudo social).
- **Banco de questões próprio** em Educação e Tecnologia; **fontes normativas** em Militar.

## Testes

`tests/run.mjs`, blocos `FASE4`: capacidade só onde há esquema · jurídica sem esquema ·
esquemas diferentes e em suas ordens · guarda de identificáveis (barra sete formatos,
deixa passar descrição clínica e social legítima) · o percurso na tela, de escrever a ser
bloqueada, corrigir, guardar, treinar em etapas e agendar a revisão · o formulário social
não é o clínico renomeado · jurídica não abre a tela nem por deep link.
