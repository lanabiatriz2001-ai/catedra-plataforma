# Auditoria jurídica do CátedraJURIS — fechamento técnico de 23/09/2026

## Estado

O saldo de defeitos confirmados que já tinha fonte suficiente para correção foi encerrado
nas duas cópias do produto: web e acervo nativo. Isso **não equivale a declarar o acervo
inteiro auditado**. Permanecem blocos sem fonte oficial acessível ou sem conferência humana
integral, discriminados ao final deste documento.

Os números da web e do corpus nativo não devem ser comparados como se fossem duas cópias
idênticas: a web reúne 15.236 verbetes; o corpus nativo tem 14.605 registros e composição
própria. A validação exigiu coerência dos registros compartilhados, não igualdade bruta de
quantidade.

## Resultado desta rodada

| Bloco | Resultado |
|---|---|
| Saldo do lote 16 | 98 de 98 pendências resolvidas; 103 ações únicas aplicadas, com duas duplicatas idênticas descartadas pelo preflight |
| Textos interrompidos | As 93 assinaturas de corte levantadas na auditoria deixaram de existir; 58 registros remanescentes foram completados nesta rodada |
| Controle de constitucionalidade | 426 de 426 registros agora trazem fonte de publicação; 363 referências já presentes no nativo foram restauradas na web |
| Artefatos de extração | 75 registros corrigidos, correspondentes a 186 substituições coordenadas entre web e nativo |
| Tribunal/fonte misturados | 9 correções específicas impediram conteúdo do STF e do STJ sob rótulo trocado |
| Verbetes híbridos do STF | Quatro conteúdos válidos antes concatenados foram preservados em verbetes próprios; uma duplicata literal foi removida e o estado pessoal migra para o id canônico |
| Identificadores substituídos | Favoritos, estatísticas, grifos e roteiros são migrados dos ids retirados para os ids canônicos |

As separações de conteúdo do STF foram feitas contra as publicações oficiais pertinentes,
entre elas os Informativos 994, 1012, 1037, 1053, 1055, 1061, 1062, 1081, 1113 e 1201.
Nenhum trecho foi completado por memória ou por inferência sem fonte.

## Guardas permanentes

- O gerador nativo aceita inclusão e exclusão explícitas, ordena os patches pelo nome e
  impede que um patch anterior sobrescreva silenciosamente o posterior.
- O verificador nativo confere o último patch aplicável por campo, inclusões, exclusões e
  migrações. Nesta versão, 1.408 de 1.408 patches foram aplicados e 2.197 verificações
  passaram: 2.189 campos, 8 inclusões e 8 exclusões.
- A suíte web mede os casos jurídicos corrigidos, rejeita regressões de corte e de artefatos
  gráficos e prova a migração de estado da duplicata `INF2022-0470` para `INF2021-0815`.
- As fatias sob demanda foram regeneradas: 62 blocos cobrem exatamente os 15.236 textos da
  web.

## Validação e entrega

| Etapa | Resultado |
|---|---|
| Chromium | Suíte completa verde; todos os testes passaram |
| WebKit | Suíte completa verde em HTTP e `file://`; todos os testes passaram |
| Corpus nativo | 14.605 registros; 426 registros de controle; verificador 2.197/2.197 verde |
| Swift Package | `swift build` verde |
| Segredos | Nenhuma chave de API encontrada nos arquivos verificados |
| Build web | `public/` gerado com sucesso, sem dado pessoal e sem dependência externa em runtime |
| Mac | Bundle universal arm64/x86_64, Developer ID, hardened runtime e carimbo de tempo; instalado em `/Applications/Cátedra.app`; assinatura estrita e hashes dos acervos conferidos |
| iPad | Bundle de aparelho assinado com `Catedra iOS Dev`; instalado no iPad da dona (bundle id `com.catedra.ipad`) |

O build continua sinalizando que Termos e Política saem como rascunho porque faltam os
dados do controlador em `docs/juridico/controlador.json`. Essa pendência é anterior e não
foi alterada pela auditoria jurídica.

## Limites de cobertura ainda abertos

Estes itens **não são erros confirmados**. São trechos cuja verificação permanece
inconclusiva porque a fonte necessária não estava acessível, não abrangia o período ou
exige leitura humana individual:

| Bloco | Limite atual |
|---|---|
| Jurisprudência em Teses, edições 250 a 283 | 345 verbetes; apenas o SCON cobre o bloco, e a rota permaneceu inacessível |
| Informativos sem edição | 192 processos ausentes dos Informativos localizados, mais 13 itens não localizados; somente o SCON permitiria fechar |
| Fontes posteriores a dezembro de 2024 | 22 itens de Teses, 11 repetitivos e 6 itens de texto extra |
| Súmulas e processos do STJ | 49 súmulas sem fonte oficial local e 4 processos de turma da camada autoral |
| Transcrições de banca | 2.341 citações; o texto oficial deve ser preservado e eventual divergência recebe nota, não reescrita |

Por isso, a formulação correta é: **saldo confirmado encerrado, auditoria integral ainda
limitada pelas fontes acima**. Uma futura retomada deve começar por esses blocos, sem
reabrir os 98 itens ou as 93 assinaturas de corte já fechados, salvo se surgir fonte oficial
nova que contradiga a evidência usada.
