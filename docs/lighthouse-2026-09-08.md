# Lighthouse — primeiro carregamento (08/09/2026)

Nova medição, com limites de comparação e amostras completas, em
[Lighthouse de 23/09/2026](lighthouse-2026-09-23.md). Os números abaixo são históricos.

Medição feita ANTES de qualquer mudança de desempenho, como o P20 pede. Lighthouse 12.8.2, modo
mobile (Moto G Power emulado), 4G lento simulado (throttling `simulate`), Chromium do Playwright,
página servida de `public/` por um servidor estático local **sem compressão** — na Vercel o HTML e
os scripts saem com gzip/brotli, então a transferência real é menor do que a listada aqui; o tempo de
script e a ordem de carregamento, não.

Duas correções foram necessárias só para conseguir medir e ficaram no mesmo commit:

- **Laço de recarregamento em localhost.** Fora de produção o `sw.js` é um interruptor: instala, se
  desinstala e recarrega os clientes. Como a página registrava o worker a cada carga, o preview local de
  `public/` recarregava para sempre (40 recargas em 10 s; o Lighthouse via 4.000 pedidos de
  `index.html`). Agora, fora de produção, o worker só é registrado quando ainda há um controlador antigo
  a desfazer. Em produção nada muda.
- **`src="{{ … }}"` num iframe** (o dos Termos/Privacidade, P14): o navegador pedia a URL literal antes
  de o runtime trocar a variável. O `src` passou a entrar por JS, como os demais iframes do host.

## Host (`index.html`, tela de entrada)

| Métrica | Valor |
|---|---|
| Performance | 32 |
| First Contentful Paint | 13,5 s |
| Largest Contentful Paint | 23,1 s (o `<h1>` da saudação) |
| Total Blocking Time | 510 ms |
| Speed Index | 13,5 s |
| Cumulative Layout Shift | 0,211 |
| Transferência total | 4,2 MB em 34 pedidos (sem compressão) |

Os cinco maiores arquivos do boot:

| Arquivo | Tamanho |
|---|---|
| `index.html` | 1,6 MB — e **baixado duas vezes** (ver abaixo) |
| `vendor/supabase.js` | 214 KB |
| `vendor/react-dom.js` | 129 KB |
| `auth.js` | 69 KB |
| `catedra-ui.css` | 64 KB |

Trabalho na thread principal: avaliação de script 831 ms (react.js 564 ms, support.js 358 ms, o
próprio HTML 286 ms), parse de HTML/CSS 194 ms, estilo e layout 176 ms.

**O que pesa, em ordem:**

1. **O HTML de 1,6 MB é o LCP.** Nada pinta antes de o documento inteiro chegar e o runtime montar o
   template. Em 4G simulado isso são 13 s até o primeiro pixel.
2. **O documento é baixado duas vezes.** O `boot()` do `support.js` faz `fetch(location.href)` para
   reler o próprio HTML e atualizar o template — mais 1,6 MB no boot. É o item mais barato de
   resolver (reutilizar o texto já carregado, ou só refazer o fetch quando o service worker avisar
   que há versão nova).
3. **CLS 0,21**: a casca troca de lugar quando o React monta por cima do `<x-dc>` e quando as fontes
   locais chegam (`font-display: swap` sem reserva de espaço) — é o U2 no host, não só nos iframes.
4. **Vendor no caminho crítico**: `supabase.js` (214 KB) e `react-dom.js` (129 KB) carregam antes da
   primeira pintura, embora o login só precise do primeiro e o template do segundo.

## LEGIS (`legis-web.html`, avulso)

| Métrica | Valor |
|---|---|
| Performance | 72 |
| First Contentful Paint | 4,5 s |
| Largest Contentful Paint | 4,7 s (um parágrafo do catálogo) |
| Total Blocking Time | 0 ms |
| Speed Index | 4,5 s |
| Cumulative Layout Shift | 0,007 |
| Transferência total | 641 KB em 10 pedidos |

Maiores arquivos: `legis-web.html` 382 KB (o catálogo de 268 leis vem embutido), `catedra-ui.css`
64 KB, três pesos da Inter (47 KB cada), `leitura-ativa.js` 21 KB. A thread principal fica em 300 ms
de script. O LEGIS está bem: o que sobra é o tamanho do HTML e o número de pesos de fonte no
primeiro carregamento (400, 600 e 700 da Inter; o 500 e a Spectral 500 não são usados na primeira
tela).

## O que fazer, na ordem em que rende

1. `support.js`: não rebaixar o HTML inteiro no boot (economiza 1,6 MB e um round-trip).
2. Esqueleto de carregamento e reserva de espaço no host (U2) para derrubar o CLS e dar um primeiro
   pixel antes do template montar.
3. Adiar `supabase.js` e `react-dom.js` para depois da primeira pintura (defer/preload ordenado).
4. Estados vazios que convidam (D4) nas telas que a pessoa nova vê primeiro — não muda o tempo, muda a
   primeira impressão. Vai em PR próprio, como o P20 pede.

## Continuação do P20 — primeira pintura do host (23/09/2026)

A abertura agora tem uma casca de carregamento antes das bibliotecas do runtime, tanto no
site quanto no bundle nativo. São aproximadamente 10 KB de CSS e JavaScript locais, também
incluídos no precache. Os tokens de cor e tipografia são um recorte **gerado** de `THEMES()`;
não há uma segunda paleta editada à mão.

A casca respeita a direção guardada, claro/escuro, tema automático e baixa estimulação.
Não mostra números, dados ou controles de estudo fictícios. Desaparece quando o `#ct-main`
real entra no `#dc-root`, sem timer que esconda carregamento ainda pendente. Em falha de
JavaScript anterior à montagem, apresenta explicação e “Tentar novamente”. O portão de
autenticação mantém prioridade e não é contornado.

O teste `tests/carregamento-inicial.mjs` suspende o runtime, mede a pintura, contraste,
largura e ausência de animação; depois libera o runtime e verifica a retirada da casca.
Cobre Planilha e Aurora, claro e escuro, 390 e 1280 px, erro e preservação das preferências.

**O que isto não afirma:** as métricas acima continuam sendo a medição de 08/09, não um
novo resultado. Esta entrega não reduz o documento principal nem elimina seu segundo
download. A releitura de `support.js` é necessária para recuperar o template dos selects
no WKWebView (PR #123); qualquer otimização precisa preservar esse caminho. Adiamento de
bibliotecas e nova revisão dos estados vazios permanecem etapas separadas.
