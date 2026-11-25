# Pedido ao Codex — brief de 25/11/2026 (8 itens)

Origem: brief da dona, repassado pelo Claude Code em 25/11/2026 a pedido dela ("envie para o
Codex executar"). O texto do brief vai abaixo **sem alteração**. As notas do Claude Code vêm
depois, separadas, e dizem o que foi conferido e o que não foi.

O brief também veio como `Brief.pdf` (na pasta Downloads da dona). O Claude Code **não leu o
PDF** (faltava o poppler na máquina). Se o PDF divergir do texto abaixo, pare e pergunte à dona.

## Trava de data

O brief manda **não começar antes de 30/11/2026** (ENAM em 29/11). A dona pediu o envio ao
Codex em 25/11 sem dizer que a trava caiu. Leitura adotada: a trava continua valendo. Antes de
30/11, só leitura; nenhum branch de item, nenhum PR de item, nenhuma mudança no Supabase.
Só a dona levanta a trava.

---

## O brief (texto da dona, literal)

Contexto: Cátedra (catedra-plataforma.vercel.app), app em Catedra.dc.html + módulos (auth.js,
fsrs.js, leitura-ativa.js, enam.js, redacao-motor.js, espelho-sugerido.js, casos.js, sw.js,
support.js, espelhos.js), Supabase (projeto catedraplataforma, tabela user_data com um JSON por
conta, RPCs SECURITY DEFINER) e funções Vercel (/api/complete, /api/sentinela, /api/tts).
Diagnóstico de 25/11/2026: 13 contas, 2 ativas em 7 dias, lista_espera com 0 linhas,
erros_cliente com 0 linhas, ai_uso com 30 chamadas de uma conta só, espelhos.js com 36 provas e
586 quesitos gerado em 21/08.

Regras: não começar antes de 30/11 (ENAM em 29/11). Não criar funcionalidade fora desta lista.
Cada módulo puro novo ou alterado precisa de teste sem navegador, como redacao-motor.js. Não
inventar: se não conseguir verificar, dizer que não verificou. Para cada item, devolver: o que
encontrou, o que mudou (arquivos), como verificou (comando ou teste), o que ficou pendente.

Itens, nesta ordem:

1. Registro de erros do cliente. Conferir se window.onerror e unhandledrejection chamam a RPC
   registrar_erro_cliente(p_build, p_alvo, p_tela, p_mensagem, p_ts) com usuário logado e
   enfileiram quando offline. Forçar um erro de teste e provar que ele chegou em erros_cliente.
   Se não chegar, consertar. Adicionar no console de administração um contador de erros das
   últimas 24 h.
2. Landing (sobre.html). Ler o número de provas e quesitos de espelhos.js em tempo de build, em
   vez de 35 e 566 fixos (hoje são 36 e 586). Na seção Segunda fase, dizer que a correção pelo
   espelho oficial vale para as provas com espelho publicado e que, nas demais, o app sugere um
   espelho por IA, sinalizado; ajustar ou retirar a frase "nada de opinião no lugar do
   critério". Acrescentar uma linha de preço do beta ("quando abrir, R$ 197 por ano", valor de
   hipótese) e, no formulário da lista de espera, uma pergunta opcional de um clique sobre
   disposição a pagar. Não coletar nada além de e-mail, área, essa resposta e data.
3. Lista de espera. A RPC entrar_lista_espera é chamável por anon por desenho. Normalizar o
   e-mail (minúsculas, trim), deduplicar, validar formato e tamanho, e colocar um campo honeypot
   no formulário. Confirmar que o admin vê a lista (admin_lista_espera).
4. Tópico obrigatório ao iniciar o cronômetro, não só ao registrar a sessão depois. Busca com
   ⌘K, três toques no iPad. A cobertura do edital passa a ser consequência de iniciar.
5. Teste WebKit na CI (Playwright, projeto webkit): abrir Fase Oral › Lei seca e afirmar que a
   lista de leis (chips alimentados por CT_LEIS) tem mais de zero itens; abrir o CátedraLEGIS e
   marcar um elemento da grade. Rodar a cada publicação.
6. Banco de espelhos. Levantar quais concursos de magistratura publicaram espelho de correção
   entre 21/08/2026 e hoje, rodar o gerador build-espelhos e regerar espelhos.js. Regra
   inviolável: quesito só entra com o PDF do espelho aberto e lido; pontuação nunca se inventa;
   URL só entra se foi vista na página oficial. Devolver a lista do que entrou e do que foi
   procurado sem espelho público.
7. Versão visível. Mostrar versão e data do build em Ajustes e no rodapé, lidas do build (ontem
   o rótulo chegava vazio no HTML estático), e registrar esse build na RPC
   registrar_erro_cliente.
8. Proteção contra senha vazada do Supabase Auth: ligar em Authentication › Policies. Se não
   tiver acesso ao painel, me devolver o passo exato para eu fazer.

---

## Notas do Claude Code (25/11/2026)

### Como trabalhar

- Leia `CLAUDE.md` inteiro antes de mexer. As regras de lá valem aqui: um item por branch e por
  PR, na ordem do brief; casos novos em `tests/`; `npm test` e `npm run test:webkit` verdes
  antes do commit; merge pelo GitHub.
- Parta da `origin/main` mais nova (`git fetch` antes). Em 25/11 ela estava em `ff3c87f`
  (merge do PR #256).
- Há outras sessões neste clone, e o checkout principal tinha mudanças sem commit em 25/11
  (branch `codex/proteger-pontes-postmessage`). Use um worktree próprio em
  `.claude/worktrees/`, fora de `~/Desktop` e `~/Documents`.
- Build e instalação no Mac e no iPad: a regra do `CLAUDE.md` manda instalar a cada mudança no
  app. A dona centralizou a instalação numa sessão única em 02/10/2026; não conferi se isso
  ainda vale. Pergunte a ela antes de buildar.
- Mudança no Supabase vivo (itens 1, 3, 7 e 8) pede o sim da dona antes de aplicar: prepare a
  migration em `supabase/migrations/`, mostre, e só então aplique.

### O que conferi na `origin/main` (`ff3c87f`), só por leitura

| Item | Achado | Como vi |
| --- | --- | --- |
| 1, 7 | `registrar_erro_cliente` aparece em `Catedra.dc.html`, `supabase/migrations/2026-09-08-telemetria.sql` e `tests/run.mjs` | `git grep -l` |
| 2 | `sobre.html`, linha 92: `<b>566</b>` e "quesitos de 35 espelhos oficiais", fixos | `grep` |
| 2, 6 | `espelhos.js`: `meta` com `gerado: 2026-08-21`, `provas: 36`, `quesitos: 586`, `naoLocalizados: 35` | cabeçalho do arquivo |
| 3 | `entrar_lista_espera` em `sobre.html` e `supabase/migrations/2026-10-07-seguranca-lista-espera.sql`; `admin_lista_espera` em `supabase/migrations/2026-09-08-lista-espera.sql`; as duas em `tests/run.mjs` | `git grep -l` |
| 5 | `.github/workflows/testes.yml` já tem o job `webkit` ("Testes WebKit (Safari)"), que roda `tests/run-webkit.mjs` | `grep` |
| 6 | Existem `scripts/build-espelhos.mjs` e `scripts/build-espelhos-fusao.mjs` | `ls scripts` |
| 7 | `scripts/build.mjs`, perto da linha 174: `const BUILD = { versao: carimbo(), data: …, alvo: 'web' }` | `grep` |

### O que NÃO conferi

- Se a migration de 07/10 já cobre parte do item 3 (normalização, deduplicação, validação).
  Leia-a antes de escrever outra.
- Se o job `webkit` da CI já cobre os dois casos do item 5 (Lei seca com chips > 0 e marcação
  na grade do LEGIS) e se ele roda "a cada publicação" ou só em PR.
- Onde está a frase "nada de opinião no lugar do critério" em `sobre.html` (meu `grep` por
  "opinião no lugar" não devolveu linha; pode estar quebrada entre linhas ou com entidade HTML).
- O estado do Supabase vivo: os números do diagnóstico (13 contas, 0 linhas em `erros_cliente`
  e em `lista_espera`) são da dona; não consultei o banco.
- Nada do item 4, do item 6 (nenhum site de tribunal ou banca foi aberto) e do item 8.

### Decisões que são da dona

- Levantar a trava de data antes de 30/11.
- Item 2: o texto final da linha de preço e as opções da pergunta de disposição a pagar.
- Item 4: o que acontece com quem inicia o cronômetro sem edital cadastrado.
- Item 8: se o Codex não tiver acesso ao painel, ela faz o passo.

### Formato da devolução (do brief)

Para cada item: o que encontrou, o que mudou (arquivos), como verificou (comando ou teste), o
que ficou pendente.
