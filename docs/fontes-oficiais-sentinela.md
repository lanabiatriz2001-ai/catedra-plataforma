# Sentinela das fontes oficiais

Este é o procedimento de operação do método automático de atualização do LEGIS e do JURIS com base em fontes oficiais.

O sentinela consulta as fontes no servidor, gera `novidades.js` e mantém `dados/sentinela/estado.json`. O aplicativo continua offline e em `file://`: nenhuma consulta externa roda no Mac, no iPad ou no navegador da pessoa usuária.

## Fontes cobertas

| Fonte | O que monitora | O que não promete nesta versão |
| --- | --- | --- |
| Planalto | Texto compilado das normas já cadastradas em `leis-seca.js`, comparado artigo a artigo. | Não descobre leis novas sozinho; o índice do Planalto fica atrás de barreira anti-robô. Norma nova entra pelo catálogo do CátedraLEGIS. |
| STF | Novas edições do Informativo de Jurisprudência, a partir da última edição já presente no CátedraJURIS. | Não cobre inteiro teor, repercussão geral nem súmulas fora do Informativo. |
| STJ | Novas edições ordinárias e extraordinárias do Informativo de Jurisprudência. | Não cobre inteiro teor, temas repetitivos nem súmulas nesta versão. O SCON continua bloqueado; a rota oficial BDJur/Revista de Súmulas, já usada na auditoria, ainda não está integrada à rotina diária. |

## Garantias antes de publicar

- `sem-novidade` quer dizer que a fonte respondeu e nada novo foi encontrado.
- `novidades` quer dizer que a fonte respondeu e trouxe itens novos ou alterados.
- `parcial` quer dizer que a fonte respondeu em parte, mas houve falha, divergência de dupla leitura ou item que exige revisão.
- `falha` quer dizer que a fonte não pôde ser consultada; isso nunca é tratado como "nenhuma novidade".
- `ultimaTentativa` anda em toda consulta.
- `ultimoSucesso` só anda quando a fonte respondeu de forma aproveitável.
- Itens com vigência indeterminada, comparação parcial ou informativo recém-detectado entram marcados para revisão.

## Comandos manuais

```bash
npm run sentinela:dry
npm run sentinela:dry -- --json
npm run sentinela -- --fonte planalto
npm run sentinela -- --fonte stf,stj
```

Use `sentinela:dry` para validar a consulta sem escrever arquivos. Use `sentinela` apenas quando a intenção for atualizar `novidades.js` e `dados/sentinela/estado.json`.

## Rotina automática

O workflow `.github/workflows/sentinela.yml` roda diariamente às 9h de Brasília e também por `workflow_dispatch`.

Ele:

1. consulta Planalto, STF e STJ;
2. grava o relatório do sentinela;
3. roda a incorporação dos informativos já suportada pelo acervo;
4. regenera os derivados do JURIS;
5. abre um PR em rascunho com os arquivos alterados.

O PR é rascunho por desenho. Atualização jurídica entra depois de revisão humana, especialmente quando houver item marcado como parcial, vigência indeterminada ou pendência.

## Checklist para disponibilizar hoje

1. Confirmar que esta branch contém apenas os arquivos do sentinela que devem entrar no PR.
2. Conferir o fechamento anterior da auditoria: o saldo confirmado foi fechado, mas a auditoria integral segue limitada pelos blocos sem fonte automatizada ou sem revisão humana.
3. Manter `novidades.js` inicial vazio, salvo se a primeira varredura real for revisada antes do merge.
4. Fazer merge do workflow na `main`, porque agendamento do GitHub Actions só dispara a partir da branch principal.
5. Conferir permissões do repositório para Actions criarem PR: `contents: write` e `pull-requests: write`.
6. Rodar pelo menos:

```bash
node tests/sentinela.mjs
npm run sentinela:dry -- --json
node scripts/verificar-segredos.mjs
npm test
npm run test:webkit
```

7. Depois do merge, executar a primeira rodada manual pelo GitHub Actions e revisar o PR em rascunho antes de publicar qualquer alteração jurídica.

## Relação com a auditoria do Claude

Este sentinela não substitui a auditoria jurídica registrada em `docs/auditoria-juris/RELATORIO.md` e `docs/auditoria-juris/FECHAMENTO-2026-09-23.md`.

Pontos que precisam continuar fiéis a essa auditoria:

- O correto é dizer "saldo confirmado encerrado", não "acervo integralmente auditado".
- A rota BDJur/Revista Eletrônica de Súmulas do STJ existe e já foi usada para conferir 627 de 676 súmulas; ela apenas não está integrada ao sentinela diário desta versão.
- O SCON continua relevante para acórdãos, teses e parte das pendências que a rota BDJur não cobre.
- Transcrições de banca preservam o texto oficial; divergência recebe nota anexa, não reescrita silenciosa.
- Itens inconclusivos por ausência de fonte acessível continuam inconclusivos, não viram erro confirmado nem "sem novidade".

## Política de primeira rodada

Para disponibilizar hoje, a opção mais segura é publicar o mecanismo com `novidades.js` vazio e deixar a primeira execução abrir um PR separado. Isso evita que uma detecção automática vire conteúdo publicado sem revisão.

Se for necessário publicar novidades já hoje, rode `npm run sentinela`, revise todos os itens gerados contra as fontes oficiais, rode a suíte completa e só então inclua `novidades.js` no PR.
