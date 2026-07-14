# Cátedra para macOS (app nativo)

Empacota o `Catedra.dc.html` como um **app nativo do macOS** — uma janela AppKit
hospedando um `WKWebView` (o motor do Safari), **sem Electron/Chromium** nem Rust.
O `.app` resultante tem ~2 MB.

O conteúdo web fica **embutido** dentro do bundle (`Contents/Resources/web/`), então
o app abre offline. O build também **vendora React, ReactDOM e supabase-js** em
`web/vendor/` (o `support.js` carregaria React do unpkg em runtime — ver gotchas).
Login e sincronização usam **Supabase** (precisa de internet).

## Construir

```bash
bash mac/build-app.sh
```

Gera `mac/build/Cátedra.app`. Para instalar, arraste para `/Applications`.

Requisitos (já presentes num Mac com Xcode): `swiftc`, `iconutil`, `sips`, `node`.

## IA (Mentor IA e correção de redação)

A IA é feita por uma **ponte nativa**: o JS chama `window.claude.complete(prompt)`,
o Swift recebe via `WKScriptMessageHandlerWithReply` e faz o `POST` com `URLSession`
(assim não há problema de CORS por o conteúdo carregar de `file://`). A URL do
endpoint (uma função `/api/complete`, ex.: Vercel/Gemini) é configurável.

- **No build:**
  ```bash
  CATEDRA_AI_ENDPOINT="https://SEU-DEPLOY.vercel.app/api/complete" bash mac/build-app.sh
  ```
- **Depois, sem recompilar** (grava no Info.plist via UserDefaults):
  ```bash
  defaults write com.catedra.desktop CatedraAIEndpoint "https://SEU-DEPLOY.vercel.app/api/complete"
  ```

**Modo mais simples — Gemini direto (sem servidor):** basta uma chave gratuita do
Google AI Studio (https://aistudio.google.com/apikey). A ponte nativa chama o Gemini
direto (sem precisar publicar `/api/complete`):
```bash
defaults write com.catedra.desktop CatedraGeminiKey "AIza...sua-chave"
# opcional: defaults write com.catedra.desktop CatedraGeminiModel "gemini-2.5-flash"
```
Ordem de precedência: `CatedraAIEndpoint` > `CatedraGeminiKey`. A chave fica só no
seu Mac (UserDefaults), nunca no bundle.

Sem endpoint **nem** chave, o app usa o **fallback heurístico local** que já existe no
Cátedra — tudo funciona, só que as respostas de IA são as heurísticas, não a IA de verdade.

## Notificações

O `WKWebView` não expõe a Web Notification API. O app instala um **shim nativo**:
`window.Notification` (permissão + `new Notification`) é ponteado para o
`UNUserNotificationCenter`, então os alertas do Cátedra viram **notificações reais
do macOS**. Ative em **Ajustes → Ativar notificações** (aparece o diálogo de
permissão do sistema uma vez). Obs.: para o diálogo de permissão aparecer de forma
confiável, o app precisa estar assinado — o ad-hoc costuma funcionar localmente;
se não pedir permissão, mova o app para `/Applications` e reabra.

## Estrutura

```
mac/
  Sources/
    main.swift    janela AppKit + WKWebView, menu, ponte de IA, links externos
    icon.swift    desenha o ícone (.icns) em CoreGraphics a partir do design do icon.svg
  build-app.sh    build web (scripts/build-macos.mjs) → ícone → compila → monta .app → assina ad-hoc
  build/          saída (Cátedra.app, ignorável)
scripts/
  build-macos.mjs gera o bundle web embutido (injeta Supabase + auth; SEM service worker)
```

## Notas / gotchas

- **`minos`**: o build compila com `-target arm64-apple-macos13.0`. Sem alvo explícito,
  o toolchain grava o `minos` do Mach-O igual ao SDK (ex.: 28.0), acima do macOS
  instalado, e o LaunchServices recusa abrir o app (erro **-10825**).
- **Snapshot**: o app embute uma *cópia* do `Catedra.dc.html` no momento do build.
  Editou o `.dc.html`? Rode `bash mac/build-app.sh` de novo para atualizar o app.
- **Assinatura**: o app é assinado **ad-hoc** (sem conta de desenvolvedor). Na primeira
  abertura o Gatekeeper pode pedir botão direito → *Abrir*. Para distribuir sem esse
  atrito é preciso assinar com Developer ID + notarização da Apple.
- **React vem do unpkg**: o `support.js` faz `loadReactUmd()` que baixa
  `react`/`react-dom` do unpkg.com em runtime — se a rede/CDN falha (ex.: rate-limit),
  a tela fica **branca** (o app React não inicia; só a gate de login, que não usa React,
  apareceria). Como o `loadReactUmd()` pula o download se `window.React` já existir, o
  build vendora os dois em `web/vendor/` e os injeta **antes** do `support.js`. Não
  precisa de Babel (o app não usa `<x-import>`).
- **JavaScriptCore ≠ V8**: o `WKWebView` usa JavaScriptCore. Erros de JS podem ter
  fraseado diferente do Chrome (ex.: *"Cannot declare a const variable twice"* em vez de
  *"has already been declared"*) — o comportamento é o mesmo, só a mensagem muda.
```
