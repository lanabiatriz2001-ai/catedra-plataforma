# Cátedra

Plataforma de estudo para concurso público, com núcleo em magistratura (segunda fase:
sentença, discursiva, prova oral) e áreas declaradas para saúde, social e policial. Reúne
num só lugar o que estudar (edital, prioridade, ciclo), com o que estudar (lei seca,
jurisprudência, informativos, acervo de contas públicas), como treinar (discursivas,
sentenças, simulados, questões, oral) e como saber se está funcionando (histórico, análise,
revisões).

O diferencial é o acervo primário verificado ao lado do critério da banca: espelhos de
correção oficiais extraídos quesito a quesito, com a pontuação que a banca atribuiu; lei
seca e jurisprudência embarcadas, funcionando offline; acervo de contas públicas (TCU e
33 tribunais de contas) como segundo acervo do CátedraJURIS.

## Três alvos

| Alvo | Como chega | Pasta |
|---|---|---|
| Web | Vercel, a partir da `main` (`scripts/build.mjs` gera `public/`) | raiz, `api/` |
| Mac | app nativo (WKWebView em Swift), assinado e notarizado | `mac/` |
| iPad | app nativo (UIKit), instalado por perfil de desenvolvimento | `ios/` |

Offline é a condição normal: fontes locais, service worker, acervos embarcados. O app
precisa abrir igual sem internet.

## Rodar

```bash
npm install
node scripts/build.mjs             # gera public/
python3 -m http.server 8977 --directory public
```

Ou abra `Catedra.dc.html` servido da raiz (é o que a suíte faz). As funções de IA precisam
das variáveis de ambiente de `.env.example`; sem elas o app cai no plano local.

## Testar

```bash
CT_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test   # Chromium
npm run test:webkit                                                                   # WebKit
node scripts/verificar-segredos.mjs                                                   # chaves
```

A CI (`.github/workflows/testes.yml`) roda os três em cada PR e em cada push na `main`.
Ligue o pré-commit uma vez por clone: `git config core.hooksPath scripts/hooks`.

## Publicar

A Vercel publica a `main` a cada merge. O projeto exige commit verificado: mescle pelo
GitHub. Variáveis de ambiente ficam só na Vercel; a lista está em `.env.example`.

Apps nativos: `mac/build-app.sh` e `ios/build-ipad.sh` (ver `DEPLOY-VERCEL.md` e a
documentação em `docs/`).

## Onde ler mais

- `CLAUDE.md` — regras da casa e armadilhas conhecidas.
- `PRODUCT.md` e `DESIGN.md` — o produto e o contrato visual.
- `docs/roadmap.md`, `docs/pedidos-claude-code.md`, `docs/especificacao-melhorias.md`.
- `docs/juridico/` — Termos de uso e Política de privacidade (fonte dos .html gerados).

## Direitos

Todos os direitos reservados. O código e os acervos deste repositório não estão
licenciados para uso, cópia ou redistribuição.
