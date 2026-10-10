# Mission 002 — desempenho real da abertura e tempo de prontidão

**Base:** \`main\` após o merge da Mission 001 (\`bbc76eef40ad10f5de24a7ace93d93e782d12a39\`).

## Por quê

A Mission 001 corrigiu uma espera sem saída e uma disputa de foco entre a casca e a autenticação. **Não provou que a plataforma abriu mais rápido.** O experimento anterior mediu ~19 s de LCP em condições com contenção, sem comparação controlada de desempenho. A medição anterior \`tests/medir-abertura.mjs\` registrava o valor 500 ms depois de a casca desaparecer, mas não rejeitava amostras cujo JavaScript/CSS local estivesse incompleto.

## Nesta entrega (002-A)

- Instrumentar FCP, LCP observado, DOMContentLoaded, prontidão visual real da casca, chamadas locais críticas que falharam e tarefas longas na thread principal.
- Registrar tempos e nomes de caminhos **somente do ambiente sintético**. Não capturar nomes, contas, textos de estudo, storage ou conteúdo das respostas.
- Rejeitar amostras cuja tela não foi montada, CSS não ficou pronto, navegador registrou erro de página ou falharam documento/script/stylesheet locais. Sem fingir ganho porque algum recurso não carregou.
- Calcular medianas somente entre amostras válidas; nunca alegar TBT do Lighthouse a partir de PerformanceObserver('longtask').
- Testar as funções de estatística por \`node --test tests/metricas-abertura.test.mjs\`.

**002-A não modifica código do aplicativo, autenticação, sync, service worker nem acervos.** Sendo alteração apenas de testes/documentação, não exige instalação nativa.

## Comparação posterior (002-B)

1. Executar build limpo e medir a **mesma main** com 3–5 amostras seriadas: \`CT_CHROME=/caminho/chrome node tests/medir-abertura.mjs\`. Isolar os dados do usuário, não usar conta pessoal.
2. Identificar o maior custo: download, parse do host, bibliotecas, CSS ou trabalho da thread principal. Diferenciar FCP, LCP, prontidão visual e disponibilidade de uma sessão autenticada. Utilizar Lighthouse e trace de CPU.
3. Propor uma variante mínima reversível. Preservar autenticação, sync, desempenho offline e dados; comparar contra a mesma base, mesmo host e perfil. Exigir 3–5 amostras válidas por variante.
4. Validar Chromium e WebKit, file://, login, foco, offline, oito temas e alvos nativos se o aplicativo mudar.
5. Definir meta percentual só após baseline válido. Não apresentar a casca como ganho de LCP.

## Gates e estado

- \`node --test tests/metricas-abertura.test.mjs\`: **PASS local** (quatro testes).
- \`node --check tests/medir-abertura.mjs\`: **PASS local**.
- Suítes Chromium/WebKit do novo PR: **aguardar CI**.
- Benchmark de 002-B: **NOT RUN**; requer Chrome acessível e execução serial limpa.
- Sem merge ou deploy da Mission 002 sem autorização específica.

Registrar data, commit, máquina, navegador, condições de CPU/rede e arquivos do benchmark quando uma medição real for executada.
