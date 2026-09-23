# P20 — medição após a primeira pintura (23/09/2026)

## Resultado e escopo

O host ainda é o gargalo. Nas três navegações completas, a mediana do LCP foi
**16,55 s**, FCP **15,35 s** e TBT **582 ms**. A casca de carregamento do PR #130
oferece feedback, mas não permite declarar a abertura rápida nem o P20 concluído.

Medição somente: nenhum código do app, dado de estudo, dependência ou preferência foi
alterado. Base: `a30041cfd595f3dbab0d836d7f127c7a7ea25451` (merge do PR #130).

## Método reproduzível

- Lighthouse **12.8.2**, já disponível no cache local; Chrome headless **153.0.0.0**.
- Mobile Moto G Power emulado: 412 × 823, DPR 1,75; throttling `simulate`, RTT 150 ms,
  throughput 1638,4 Kbps e CPU ×4 (padrões registrados no relatório).
- `node scripts/build.mjs`; `public/` servido por Python HTTP em `127.0.0.1:8189`,
  **sem compressão**. Não equivale à transferência da Vercel nem ao carregamento nativo.
- Perfil temporário criado pelo Lighthouse, sem conta ou dados reais. Não houve login,
  semeadura de registros, sincronização da conta da dona ou alteração do app instalado.
- Três amostras completas por página, sequenciais. Mediana de cada métrica, não uma
  seleção da melhor nota. Os tamanhos abaixo incluem o overhead HTTP reportado pela ferramenta.

Comandos usados (o executável pode ser substituído pelo Lighthouse 12.8.2 já instalado):

```sh
node scripts/build.mjs
python3 -m http.server 8189 --bind 127.0.0.1 --directory public
# Em outro terminal; repetir três vezes por URL, sem medições concorrentes:
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  node /Users/lanab/.npm/_npx/8003d8991b0d346b/node_modules/lighthouse/cli/index.js \
  http://127.0.0.1:8189/index.html --only-categories=performance \
  --chrome-flags='--headless' --output=json --output-path=/private/tmp/host.json --quiet
# Repetir para /legis-web.html, com outro output-path.
```

## Amostras completas

| Página / rodada | Performance | FCP (s) | LCP (s) | TBT (ms) | CLS | Transferência (bytes) |
|---|---:|---:|---:|---:|---:|---:|
| Host 2 | 39 | 15,345 | 17,782 | 660 | 0,005585 | 2.905.387 |
| Host 3 | 41 | 15,345 | 16,545 | 565 | 0,005585 | 2.905.387 |
| Host 5 | 40 | 15,345 | 16,545 | 582 | 0,005585 | 2.905.387 |
| **Host — mediana** | **40** | **15,345** | **16,545** | **582** | **0,005585** | **2.905.387** |
| LEGIS 2 | 70 | 4,804 | 4,954 | 0 | 0,006555 | 710.428 |
| LEGIS 3 | 70 | 4,803 | 4,953 | 0 | 0,006555 | 710.428 |
| LEGIS 4 | 70 | 4,803 | 4,803 | 0 | 0,006555 | 710.428 |
| **LEGIS — mediana** | **70** | **4,803** | **4,953** | **0** | **0,006555** | **710.428** |

Relatórios brutos locais: `/private/tmp/catedra-p20-host-{2,3,5}.json` e
`/private/tmp/catedra-p20-legis-{2,3,4}.json`. São artefatos temporários; as métricas e
condições relevantes ficam preservadas neste documento. Horário UTC das amostras:
23/09/2026, aproximadamente 10:10–10:13.

**Validade e descartes:** a rodada inicial do host terminou antes de receber scripts
locais, incluindo `support.js`; o LCP era o título do esqueleto, não o app. Foi descartada,
assim como a primeira rodada do LEGIS, feita durante a coleta inicial concorrente.
A rodada 4 do host também foi descartada: `auth.js` não foi entregue (`statusCode: -1`).
Não foi determinada a causa dessas falhas transitórias do servidor/coleta; não são
apresentadas como ganho de desempenho. As rodadas válidas receberam os scripts locais.

O host tentou as RPCs públicas `app_avisos` e `is_admin`, que falharam por resolução de
nome do Supabase; um diagnóstico separado confirmou `ERR_NAME_NOT_RESOLVED`.
Esses resultados descrevem esse ambiente, não o comportamento com backend saudável.
O pedido incidental de `favicon.ico` recebeu 404. Nenhum aviso geral do Lighthouse foi
emitido nas amostras válidas, mas isso **não** significa ausência de falhas de rede.

## O que foi realmente contado como LCP

- Host: `h1.cth-h1`, saudação “Bom dia, Aluno.”, nas três amostras completas.
- LEGIS: parágrafo de apresentação do catálogo, nas três amostras.
- Não é uma medida de autenticação concluída nem do tempo até iniciar uma sessão.
  Diagnóstico separado em perfil descartável confirmou `#ct-main` montado e a casca
  retirada; não substitui a validação do fluxo de login nem do dispositivo físico.

## Os cinco maiores arquivos

| Host (rodadas 2, 3 e 5) | Bytes transferidos |
|---|---:|
| `index.html` | 1.751.199 |
| `vendor/supabase.js` | 218.360 |
| `vendor/react-dom.js` | 132.029 |
| `catedra-ui.css` | 110.591 |
| `auth.js` | 94.036 |

| LEGIS (rodadas 2, 3 e 4) | Bytes transferidos |
|---|---:|
| `legis-web.html` | 392.459 |
| `catedra-ui.css` | 110.591 |
| `fonts/inter-400-normal.woff2` | 48.620 |
| `fonts/inter-600-normal.woff2` | 48.620 |
| `fonts/inter-700-normal.woff2` | 48.620 |

O host relê `index.html`, mas a segunda requisição registrou **zero bytes transferidos**
nestas três rodadas (resposta 200 atendida sem novo tráfego contabilizado). Portanto,
não se pode prometer economia de 1,75 MB removendo a releitura. O caminho continua
necessário para recuperar os selects no WKWebView (PR #123).

## Comparação e próxima implementação

O relatório de 08/09 anotou host LCP 23,1 s, TBT 510 ms, CLS 0,211 e 4,2 MB; LEGIS LCP
4,7 s e 641 KB. **Não é um experimento antes/depois controlado:** browser, conteúdo,
autenticação, cache e outras alterações diferem. Não atribuir as diferenças ao PR #130.

Prioridades para os próximos PRs:

1. D4: revisar estados vazios de Início, Edital, Simulado e LEGIS, preservando dados e
   substituindo apenas contabilidade vazia por título, explicação e ação útil.
2. Medir uma variante de carregamento ordenado das bibliotecas contra a mesma base,
   com scripts locais entregues e elemento LCP identificado. Não adiar autenticação
   de modo que exponha conteúdo nem alterar `support.js` sem regressão de selects.
3. Investigar parse do HTML e trabalho da thread principal. Tamanho em bytes isolado
   não prova qual mudança reduzirá o tempo; exigir comparação controlada.

O build passou. O código de execução é idêntico ao `285ae1e`, validado nas suítes
Chromium e WebKit completas na entrega #130; não foram reexecutadas por esta mudança
exclusivamente documental. Não há build/instalação nativa adicional para este relatório.
