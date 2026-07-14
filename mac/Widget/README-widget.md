# Widget do macOS (WidgetKit) — pronto para ativar com conta paga

O widget do Cátedra está **100% codificado** e **verificado até onde a assinatura
ad-hoc permite**. Ele **não é montado pelo `build-app.sh`** de propósito: numa
build ad-hoc o macOS recusa registrar a extensão na galeria, e assinar com conta
gratuita faria o app (e o widget) **expirarem a cada 7 dias**. Este documento é o
guia de ativação para quando houver **Apple Developer Program (pago)**.

## O que já está pronto (nada muda na ativação)

| Peça | Arquivo | Papel |
|---|---|---|
| Payload web | `Catedra.dc.html` → `_widgetPayload()` + `window.catedraWidgetPayload` | Dias até a prova, revisões, meta %, ofensiva, próximo bloco |
| Ponte do host | `mac/Sources/main.swift` → `pushWidgetData()` / `startWidgetSync()` | Lê o payload via `evaluateJavaScript`, grava no App Group, recarrega o timeline |
| Extensão | `mac/Widget/CatedraWidget.swift` | Widget WidgetKit (small + medium), lê o App Group |
| Entitlements | `mac/Catedra.entitlements`, `mac/Widget/Widget.entitlements` | App Group `group.com.catedra.desktop` |
| Script de ativação | `mac/Widget/build-widget.sh` | Monta a `.appex`, embute perfis, assina os dois bundles |

A ponte no `main.swift` já está compilada no app do dia a dia — sem a entitlement
de App Group, a escrita vira um no-op inofensivo; nada quebra.

## Por que precisa de conta paga

- **Ad-hoc** (`codesign --sign -`): o `pkd` recusa registrar a `.appex` na galeria.
  Verificado nesta máquina: `pluginkit -m` lista dezenas de widgets de terceiros
  (todos com Team ID) mas nunca o nosso, mesmo após `lsregister -f`, `pluginkit -a`
  e reinício dos daemons.
- **Conta gratuita** (Apple Development sem Developer Program): emite perfis de
  **7 dias**. O App Group é uma entitlement *restrita* que exige perfil; com conta
  grátis o app/widget param de abrir depois de uma semana. Inviável para um widget
  de mesa.
- **Conta paga**: perfis de **1 ano**, App Group estável, widget registra normal.

## Ativação (conta paga) — caminho recomendado: Xcode

1. Xcode → **Settings → Accounts**: logar com a Apple ID do time pago.
2. Criar um projeto/target macOS com **bundle id `com.catedra.desktop`** e uma
   **Widget Extension** com bundle id `com.catedra.desktop.widget`.
3. Nos dois targets: **Signing & Capabilities → + App Groups →
   `group.com.catedra.desktop`** e ligar **Automatic manage signing**. O Xcode
   registra os App IDs + o App Group e baixa os perfis.
4. Reaproveitar os arquivos existentes: `CatedraWidget.swift` na extensão, a ponte
   de `main.swift` no app, e o `_widgetPayload()` da web — **nenhuma lógica muda**.
5. Build/Run pelo Xcode. O widget aparece em **Editar widgets → Cátedra**.

## Ativação — caminho alternativo: manter o build shell + assinar

Se preferir continuar com o `build-app.sh` (swiftc) em vez de migrar tudo para o
Xcode, use o script dedicado depois de gerar os perfis (passos 1–3 acima geram os
perfis em `~/Library/Developer/Xcode/UserData/Provisioning Profiles/`):

```bash
bash mac/build-app.sh                                   # 1) monta o app (ad-hoc)

CATEDRA_SIGN_ID="Developer ID Application: SEU NOME (TEAMID)" \
CATEDRA_APP_PROFILE="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles/<app>.provisionprofile" \
CATEDRA_WIDGET_PROFILE="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles/<widget>.provisionprofile" \
bash mac/Widget/build-widget.sh                         # 2) monta+assina o widget
```

O `build-widget.sh` compila a extensão (`-parse-as-library`), monta a
`.appex` em `Contents/PlugIns/`, embute os perfis e assina **a `.appex` primeiro,
o app depois** (sem `--deep`), cada um com o seu entitlement de App Group. No fim
ele checa `pluginkit` e diz se o widget registrou.

## Gotchas já resolvidos (não repetir)

- **`@main` + arquivo único** exige `-parse-as-library` no `swiftc`, senão:
  *"'main' attribute cannot be used in a module that contains top-level code"*.
- **Assinar com dev cert SEM perfil** derruba o `open`/amfid (o binário roda por
  exec direto, mas não pelo LaunchServices). O perfil resolve.
- **Rodar a versão dev-assinada cria o App Group container dono do time** em
  `~/Library/Group Containers/group.com.catedra.desktop` (TCC impede apagar pelo
  shell). Se depois voltar ao ad-hoc e o `open` falhar, re-assine o app ad-hoc
  **sem** a entitlement de App Group para restaurar.
- **Bundle id do widget** deve ter o prefixo do app: `com.catedra.desktop.widget`.
