# Mission 002 — abertura medida e compactação conservadora da web

Execução em **20/10/2026**, no mesmo [PR #242](https://github.com/lanabiatriz2001-ai/catedra-plataforma/pull/242), branch `mission-002-prontidao`.

Base do aplicativo: `c2104c50fcef3cf1efc13034b5a902c9896e877c` (002-A). A `main` confirmada continua em `bbc76eef40ad10f5de24a7ace93d93e782d12a39`, após a Mission 001. A Mission 001 não comprovava redução de LCP; os resultados abaixo pertencem exclusivamente a este experimento.

## Resultado e alcance

O documento de 2,16 MB dominava a transferência inicial: terminava em cerca de 16,32 s, antes da montagem com CSS em 18,17 s. O trace também mostra uma segunda leitura do documento pelo runtime; ela foi preservada porque recupera o template original, inclusive no WebKit. Não atribuímos o custo inicial aos acervos carregados sob demanda.

A mudança compacta **somente o corpo de `script[type="text/x-dc"][data-dc-script]` no artefato web**, antes de escrever `public/`. Usa `esbuild@0.27.0` fixo como ferramenta de build: `minifyWhitespace:true`, `minifyIdentifiers:false`, `minifySyntax:false`, `keepNames:true`, `target:esnext`, sem bundling. O compilador reimprime a lógica e preserva nomes; não é um transformador feito com regex de comentários JavaScript.

A fonte editável `Catedra.dc.html`, `auth.js`, `support.js`, CSS, fontes, acervos, esquema de persistência, sincronização e hosts Swift permanecem intactos. As versões já existentes de dependências foram preservadas, inclusive o lock de Playwright 1.62.1. A ferramenta de compactação não vai para o navegador.

**O bundle nativo continua usando a fonte original.** `build-macos.mjs` e o pós-clone do Xcode Cloud não passaram a exigir instalação de dependências. Essa delimitação evita alterar o caminho nativo offline nesta otimização da web.

## Medições reais

Mac16,12 arm64, macOS 27.2, Node 24.16.0, Chrome 155.0.8059.85 e Lighthouse 12.8.2. Cargas seriais em perfis/contextos descartáveis, viewport 390 × 844, CPU ×4 e rede configurada para 150 ms e 1,6 Mbps. Servidor estático em localhost **sem compressão HTTP**. Não houve benchmarks, builds ou suítes de navegador concorrentes nas amostras aceitas. O host também realizou leituras e verificações leves.

Cada braço tem **3 amostras válidas em CDP e 3 em Lighthouse**. Os dois protocolos têm detalhes diferentes de emulação e seus valores absolutos não devem ser misturados. Não são medições de produção nem de aparelho físico.

| Medida (mediana) | Baseline | Variante | Diferença |
|---|---:|---:|---:|
| HTML gerado | 2.165.044 B | 1.799.898 B | −365.146 B (−16,9%) |
| LCP observado, CDP | 18.708 ms | 16.564 ms | −2.144 ms (−11,5%) |
| Prontidão desde a navegação, CDP | 18.166 ms | 16.329 ms | −1.837 ms (−10,1%) |
| FCP, CDP | 576 ms | 580 ms | +4 ms; equivalente neste ensaio |
| LCP Lighthouse | 18.093 ms | 16.418 ms | −1.676 ms (−9,3%) |
| TBT Lighthouse | 589 ms | 627 ms | **+38 ms (+6,4%)** |
| CLS Lighthouse | 0,00401 | 0,00401 | igual |

A redução de latência é coerente com a redução de bytes. **Não há evidência de ganho de CPU**: o TBT observado aumentou; as três amostras da variante variam de 558 a 648 ms. Esta amostra pequena não permite extrapolar significância estatística, tráfego comprimido, cache quente ou aparelhos.

O elemento LCP final é o parágrafo do **portão de login**, igual nos dois braços. Prontidão significa `#ct-main` montado, CSS completo sinalizado e casca removida, possivelmente atrás do portão. **Não significa login completo, sync terminado ou sessão de estudo disponível.** A espera por fontes e recursos valida a amostra, sem redefinir retroativamente o instante da casca.

Os números exatos, perfis, exclusões e hashes estão em [evidencias/mission-002-2026-10-20.json](evidencias/mission-002-2026-10-20.json). O baseline é o build de c2104c5; a variante foi medida antes do commit final e é identificada por SHA-256 do HTML e dos quatro arquivos que afetam seu build. O carimbo embutido pode mudar ao rebuildar o commit final.

## Qualidade do instrumento

- Corrigido o relógio de longtasks: usa `CT_ABERTURA_METRICAS.pronto`, relativo à navegação, sem confundir com a duração relativa ao início da casca.
- Rejeita timeout, erro JavaScript, CSS incompleto, métrica obrigatória ausente, fonte com erro, recurso local falho/pendente e erro de coleta/trace. Medianas têm denominadores explícitos.
- Aguarda `document.fonts.ready` e 1 s sem pedidos locais, dentro do prazo total. Captura navegação, todos os pedidos locais e seus timings, capacidades das APIs, elemento LCP e trace CDP opcional.
- Rede externa bloqueada; somente dados sintéticos em contextos novos. Não captura conteúdo de estudo, storage ou conta pessoal no benchmark.
- Lighthouse mede LCP/TBT; a comprovação da montagem/prontidão vem do CDP. O bloqueio de longtasks não é apresentado como TBT.

As primeiras **3 coletas Lighthouse foram descartadas** por 404 no pedido automático de favicon do harness. O protocolo corrigido serve o ícone real existente nesse pedido, igual nos dois braços. Os seis avisos de SVG `{{ ... }}` durante o parse do template são registrados e identificados separadamente de exceções JavaScript. Uma coleta adicional foi excluída por análise auxiliar de compilação no host durante a coleta; entrou uma reposição serial. Nenhuma dessas quatro coletas participa das medianas finais.

## Validação e preservação

| Gate | Estado local | Evidência/limite |
|---|---|---|
| Unidades de métricas e compactação | PASS | 14 testes; semântica sintética, persistência, regex, template literals, ASI, nomes, erro e idempotência |
| Build web | PASS | mesmo hash da variante conferido por revisão independente |
| Segredos | PASS | verificador executado novamente com todos os arquivos novos preparados para commit; saída 0 |
| Dependências | PASS no escopo do npm audit | consulta retornou zero avisos conhecidos; não equivale a auditoria completa de segurança |
| Artefato publicado, HTTP Chromium/WebKit | PASS local | 16 combinações por motor, CSS/fontes/tema, recarga e persistência sintética; WebKit HTTP final também encerrou com saída 0 |
| Artefato publicado, file:// Chromium | PASS | dois casos finais com carga e recarga sob bloqueio de todo HTTP(S), inclusive localhost; saída 0 |
| Artefato publicado, file:// WebKit | BLOCKED local (script terminou 1) | o proxy recusa a releitura por fetch; não houve exclusão silenciosa do erro |
| npm test | PASS | 5.402 verificações, saída 0; suíte completa após corrigir a fixture de data E1 |
| npm run test:webkit | PASS | 2.909 verificações, saída 0; HTTP, file:// e bundle local presentes |
| Compilação Mac/iPad | Ver recibos no PR | builds seriais vinculados ao commit final; sem executar/instalar apps |
| Instalação/execução nativa isolada | BLOCKED | iPad físico indisponível; perfis independentes ausentes; instaladores atuais substituem os apps e usam caminhos de dados compartilhados |
| CI da revisão final | Consultar o PR | os checks de c2104c5 já passavam; isso não substitui os checks da revisão nova |
| Merge/deploy de produção | NOT RUN | exigem autorização explícita e específica para Mission 002 |

`tests/logica-publicada.mjs` verifica o artefato compactado em ambos os motores: folha CSS real, fontes carregadas, cor/fonte/direção calculadas, oito direções claras/escuras, gate visível e fundo inerte, IDs sintéticos preservados após autosave e recarga. Não oferece uma conta falsa como prova de login real. As suítes existentes cobrem os fluxos de auth/sync com fixtures, foco, contraste, toque, offline e `file://`.

O novo ensaio de arquivo local usa bloqueio de TODO HTTP(S), inclusive localhost, nos dois motores; não usa `setOffline(true)`. O probe mínimo mostrou que essa API do WebKit impede até a navegação de um HTML vazio em `file://`, com erro interno. Esse primeiro ensaio falhou e foi corrigido no harness. A navegação então funcionou, mas o WebKit emitiu o diagnóstico CORS de `fetch(file://)` mesmo com a rejeição capturada. O mesmo ocorreu em um HTML mínimo de 153 bytes e no bundle original, com `support.js` idêntico. O limite já está documentado em `tests/template-file-url.mjs`; o iPad nativo configura a preferência de acesso a arquivos que o Playwright não expõe. Mantemos esse gate real como BLOCKED e não ignoramos o erro. A CI nova valida explicitamente o HTTP; a suíte WebKit existente permanece íntegra, com seus casos file:// e fixture de releitura com status 0. No perfil corrigido, `navigator.onLine` continua verdadeiro: comprovamos carga/recarga local sem respostas HTTP, não a indicação de desconexão do sistema nem um iPad físico.

Na primeira execução Chromium, uma fixture ENAM/E1 com prova fixa em 15/10/2026 esperava dias negativos em 20/10, enquanto o produto normaliza para zero. A execução foi interrompida após essa falha. O teste ganhou contexto e relógio próprios em 02/09/2026, sem relaxar a asserção ou alterar o aplicativo; a suíte completa corrigida terminou com 5.402 verificações aprovadas e saída 0.

Os recibos de CI e compilações nativas vinculados ao commit final ficam na descrição do PR. A revisão independente não encontrou blocker técnico novo no minificador ou nos dados medidos. Os nove avisos do compilador sobre duplicações no código original continuam visíveis e não foram corrigidos nesta missão. A compactação reduz a utilidade dos números de linha do código gerado; nomes e fonte original permanecem disponíveis para diagnóstico.

## Reproduzir

Gere o baseline de c2104c5 e a variante em cópias isoladas, com os mesmos instrumentos atualizados e versões de ferramentas. Não execute builds/testes pesados durante as coletas.

```bash
npm ci --no-audit --no-fund
npm run build
CT_CHROME=/caminho/chrome CT_PORT=8168 CT_MEDICAO_AMOSTRAS=3 \
  CT_MEDICAO=work/cdp.json CT_TRACE_DIR=work/traces node tests/medir-abertura.mjs
CT_CHROME=/caminho/chrome CT_PORT=8169 CT_MEDICAO_AMOSTRAS=3 \
  CT_LIGHTHOUSE_ROOT=/caminho/node_modules-com-lighthouse-12.8.2 \
  CT_MEDICAO_DIR=work/lighthouse node tests/medir-lighthouse.mjs
node --test tests/metricas-abertura.test.mjs tests/compactar-logica.test.mjs
CT_CHROME=/caminho/chrome node tests/logica-publicada.mjs
CT_BROWSER=webkit CT_PUBLICADA_ORIGEM=http node tests/logica-publicada.mjs
# file:// estrito separado: neste proxy Mac, a releitura é BLOCKED por CORS
CT_BROWSER=webkit CT_PUBLICADA_ORIGEM=file node tests/logica-publicada.mjs
npm test
npm run test:webkit
```

Lighthouse e chrome-launcher são ferramentas externas para diagnóstico; não são dependências do aplicativo. Os traces/LHR brutos ficam nos artefatos da execução; os hashes e resumos de revisão estão versionados.

## Publicação e rollback

A proteção existente em `vercel.json` continua desabilitando o preview automático de `mission-002-prontidao`. Não houve mudança direta na main nem criação de outro PR. Não instalar bundles com os IDs atuais para um ensaio sintético: a mera mudança de bundle ID não isola os diretórios compartilhados dos hosts.

Antes de publicar: conferir o CI do commit final, resolver/aceitar explicitamente os limites nativos e obter autorização específica de merge/deploy para Mission 002. O rollback é reverter a alteração de compactação por PR e reconstruir o artefato; não há migração nem desfazimento de dados de estudo.
