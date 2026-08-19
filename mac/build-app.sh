#!/usr/bin/env bash
# build-app.sh — monta o Cátedra.app (nativo macOS) a partir do Catedra.dc.html.
#
#   bash mac/build-app.sh
#
# Para ligar a IA de verdade, passe a URL do seu endpoint /api/complete:
#   CATEDRA_AI_ENDPOINT="https://SEU-DEPLOY.vercel.app/api/complete" bash mac/build-app.sh
# (sem isso o app funciona normalmente, usando o fallback heurístico local.)
#
# NOTA sobre o widget (WidgetKit): os fontes vivem em mac/Widget/ mas NÃO são
# montados por este build. Um widget de macOS é uma extensão (.appex) que só
# aparece na galeria quando o app é assinado com um perfil de provisionamento
# Developer (App Group). Sob assinatura ad-hoc o pkd recusa registrar a extensão.
# Para ativar o widget é preciso um build assinado (Xcode/Developer ID) — ver
# mac/Widget/README-widget.md.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
BUILD="$HERE/build"
NAME="Cátedra"
EXEC="Catedra"
BUNDLE_ID="com.catedra.desktop"
APP="$BUILD/$NAME.app"
# Endpoint de IA padrão = a produção na Vercel. Antes vinha VAZIO, então o app saía com
# a IA morta e dizia "a IA não respondeu" — quem recebia o app achava que era instabilidade
# e ficava tentando de novo. A função exige a sessão do Supabase, que a ponte JS já manda,
# então o testador logado tem IA funcionando sem configurar nada.
AI_ENDPOINT="${CATEDRA_AI_ENDPOINT:-https://catedra-plataforma.vercel.app/api/complete}"
GEMINI_KEY="${CATEDRA_GEMINI_KEY:-}"

echo "→ 1/5  Gerando bundle web (Catedra.dc.html → mac/build/web)…"
node "$ROOT/scripts/build-macos.mjs"

# Alvo de implantação explícito: sem isso o toolchain grava minos = versão do
# SDK (ex.: 28.0), acima do macOS instalado, e o LaunchServices recusa abrir o
# app (erro -10825). 14.0 é a base mínima porque a aba Vade Mecum (SwiftUI) usa
# Observation (@Observable) e SettingsLink, disponíveis a partir do macOS 14.
TARGET="arm64-apple-macos14.0"

echo "→ 2/5  Desenhando o ícone (.icns)…"
ICONSET="$BUILD/Catedra.iconset"
rm -rf "$ICONSET"; mkdir -p "$ICONSET"
swiftc -O -target "$TARGET" "$HERE/Sources/icon.swift" -o "$BUILD/makeicon" -framework AppKit
"$BUILD/makeicon" "$ICONSET"
iconutil -c icns "$ICONSET" -o "$BUILD/AppIcon.icns"

echo "→ 3/5  Compilando o app (Swift + WebKit + CátedraLEGIS + CátedraJURIS)…"
LEGIS_SOURCES=$(find "$HERE/vendor/legis" -name '*.swift')
JURIS_SOURCES=$(find "$HERE/vendor/juris" -name '*.swift')
# Macros do SwiftUI (@State, @Environment… viraram macros nos SDKs novos): o plugin
# libSwiftUIMacros.dylib mora na PLATAFORMA, não na toolchain. O Xcode passa esse
# caminho sozinho; o swiftc na linha de comando não — sem isto o build morre com
# "external macro implementation type 'SwiftUIMacros.StateMacro' could not be found"
# seguido de uma cascata enganosa de "cannot assign to property: 'self' is immutable".
PLUGIN_DIR="$(xcrun --show-sdk-platform-path 2>/dev/null)/Developer/usr/lib/swift/host/plugins"
PLUGIN_FLAGS=()
if [ -d "$PLUGIN_DIR" ]; then PLUGIN_FLAGS=(-plugin-path "$PLUGIN_DIR")
else echo "     aviso: plugins de macro não encontrados em $PLUGIN_DIR — se o build falhar em @State, confira o xcode-select"; fi
# Binário UNIVERSAL (arm64 + x86_64). Antes saía só arm64: num Mac Intel o app não
# abria de jeito nenhum — nem com o ritual do Gatekeeper — porque simplesmente não
# havia código para aquela arquitetura. Compilamos as duas fatias e juntamos com lipo.
# Se a fatia Intel falhar (SDK sem suporte na máquina), seguimos só com arm64 avisando,
# em vez de derrubar o build inteiro.
compilar_fatia() {
  swiftc -O -target "$1" "${PLUGIN_FLAGS[@]}" $LEGIS_SOURCES $JURIS_SOURCES "$HERE/Sources/main.swift" -o "$2" \
    -framework Cocoa -framework WebKit -framework UserNotifications -framework SwiftUI \
    -framework Network -framework PDFKit
}

echo "     · fatia arm64 (Apple Silicon)…"
compilar_fatia "arm64-apple-macos14.0" "$BUILD/$EXEC.arm64"

echo "     · fatia x86_64 (Macs Intel)…"
if compilar_fatia "x86_64-apple-macos14.0" "$BUILD/$EXEC.x86_64" 2>"$BUILD/x86.log"; then
  lipo -create "$BUILD/$EXEC.arm64" "$BUILD/$EXEC.x86_64" -output "$BUILD/$EXEC"
  echo "     · universal: $(lipo -archs "$BUILD/$EXEC")"
else
  cp "$BUILD/$EXEC.arm64" "$BUILD/$EXEC"
  echo "     aviso: a fatia Intel não compilou — o app sai SÓ para Apple Silicon."
  echo "            Macs Intel não vão conseguir abrir. Detalhe em $BUILD/x86.log"
fi
rm -f "$BUILD/$EXEC.arm64" "$BUILD/$EXEC.x86_64"

echo "→ 4/5  Montando $NAME.app…"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BUILD/$EXEC"        "$APP/Contents/MacOS/$EXEC"
cp "$BUILD/AppIcon.icns" "$APP/Contents/Resources/AppIcon.icns"
cp -R "$BUILD/web"       "$APP/Contents/Resources/web"
# CátedraLEGIS (Vade Mecum de leis) não embute corpus: as normas são baixadas do
# Planalto/DOU e guardadas em ~/Library/Application Support/VadeMecum em runtime.
# CátedraJURIS (Vade Mecum de jurisprudência) EMBUTE o corpus-semente (súmulas/
# informativos); os dados vivos ficam em ~/Library/Application Support/VadeMecumJuris.
JURIS_RES="$HOME/App Jurisprudências/VadeMecumJuris/Sources/VadeMecum/Resources"
for f in corpus.json notas.json indice.json; do
  [ -f "$JURIS_RES/$f" ] && cp "$JURIS_RES/$f" "$APP/Contents/Resources/$f"
done
# A Central de Contas (TCU + TCEs) NAO vem do repo do Vade Mecum: e gerada aqui, dos
# mesmos dados que a web usa (scripts/build-contas-nativo.mjs -> corpus-contas.json).
[ -f "$ROOT/corpus-contas.json" ] && cp "$ROOT/corpus-contas.json" "$APP/Contents/Resources/corpus-contas.json"
# Mapa de incidência por artigo (LEGIS nativo): mesmo dado do incidencia.js da web, em JSON.
[ -f "$ROOT/incidencia.json" ] && cp "$ROOT/incidencia.json" "$APP/Contents/Resources/incidencia.json"
# Banco de discursivas/peças (scripts/build-discursivas-nativo.mjs -> discursivas.json): alimenta o Simulado.
[ -f "$ROOT/discursivas.json" ] && cp "$ROOT/discursivas.json" "$APP/Contents/Resources/discursivas.json"
[ -f "$ROOT/incidencia-verbetes.json" ] && cp "$ROOT/incidencia-verbetes.json" "$APP/Contents/Resources/incidencia-verbetes.json"
printf 'APPL????' > "$APP/Contents/PkgInfo"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>$NAME</string>
  <key>CFBundleDisplayName</key><string>$NAME</string>
  <key>CFBundleExecutable</key><string>$EXEC</string>
  <key>CFBundleIdentifier</key><string>$BUNDLE_ID</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSHumanReadableCopyright</key><string>Cátedra · Plataforma de Estudos</string>
  <!-- Sem estas duas frases o macOS pede a permissão SEM dizer para quê, e quem
       recebe o app tende a negar. Pior: negar aqui é silencioso — o backup
       semanal simplesmente para de acontecer. Vale mais ainda agora que o app é
       assinado com Developer ID: trocar a identidade de assinatura RESETA as
       decisões de privacidade já dadas nesta máquina. -->
  <key>NSDocumentsFolderUsageDescription</key><string>O Cátedra guarda um backup semanal dos seus estudos em Documentos › Cátedra Backups, para você não perder nada.</string>
  <key>NSDownloadsFolderUsageDescription</key><string>O Cátedra salva na pasta Downloads os arquivos que você exporta (edital, calendário, relatórios).</string>
  <key>CatedraAIEndpoint</key><string>$AI_ENDPOINT</string>
  <key>CatedraGeminiKey</key><string>$GEMINI_KEY</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.education</string>
</dict>
</plist>
PLIST

echo "→ 5/5  Assinando…"
# DUAS assinaturas possíveis, e a diferença decide se o testador consegue abrir:
#
#   · "Developer ID Application" (conta paga da Apple) + notarização → o app abre
#     com duplo clique na máquina de qualquer um, sem ritual nenhum.
#   · ad-hoc (o que sempre foi feito aqui) → o Gatekeeper recusa, e quem recebe
#     precisa do "Abrir Mesmo Assim" nos Ajustes do Sistema.
#
# ARMADILHA que custou caro descobrir: NÃO basta trocar o `-s -` pelo Developer ID.
# Sem `--options runtime` (hardened runtime) e sem `--timestamp`, a notarização
# REPROVA — e nada avisa nesta máquina, porque o app abre normalmente aqui. O erro
# só aparece quando o testador tenta abrir. Por isso as duas flags são obrigatórias
# e conferidas logo abaixo.
#
# `--deep` saiu: está DEPRECADO para assinar desde o macOS 13 (man codesign) e
# aplica as mesmas opções a todo conteúdo aninhado — quase nunca o que se quer.
# Aqui o bundle é plano (nenhum .appex/.framework/.dylib/.xpc dentro), então uma
# assinatura no .app basta. No dia em que o widget entrar, a ordem inverte: assina
# o .appex ANTES do .app.
#
# `--entitlements` também não: o app NÃO é sandboxed e não precisa de nenhum
# entitlement. Em especial NÃO usar `disable-library-validation` — a doc da Apple
# avisa que o Gatekeeper roda checagens extras em quem o desliga e pode BLOQUEAR o
# app. E o WKWebView não exige `allow-jit`: o JavaScript roda no processo
# com.apple.WebKit.WebContent da própria Apple, que já tem esse entitlement.
# (mac/Catedra.entitlements pede app-groups, resquício do widget que nem é montado;
# passá-lo aqui seria peso morto — o Group Container é ingravável sem perfil.)
SIGN_ID="${CATEDRA_SIGN_ID:-}"
if [ -z "$SIGN_ID" ]; then
  # `grep` sem casar devolve 1 e, com `set -e`, derrubaria o build inteiro: || true.
  SIGN_ID="$(security find-identity -v -p codesigning 2>/dev/null \
             | grep 'Developer ID Application' | head -1 \
             | sed -E 's/.*"(.*)"/\1/' || true)"
fi

if [ -n "$SIGN_ID" ]; then
  echo "     identidade: $SIGN_ID"
  if codesign --force --options runtime --timestamp --sign "$SIGN_ID" "$APP" 2>"$BUILD/codesign.log"; then
    _cs="$(codesign -dvv "$APP" 2>&1)"
    case "$_cs" in *runtime*) echo "     ✓ hardened runtime";; *) echo "     ⚠ SEM hardened runtime — a notarização vai reprovar";; esac
    case "$_cs" in *Timestamp=*) echo "     ✓ carimbo de tempo";; *) echo "     ⚠ SEM carimbo de tempo — a notarização vai reprovar";; esac
    echo "     assinado para DISTRIBUIÇÃO"
  else
    # Falha mais comum: sem internet. O --timestamp precisa alcançar
    # timestamp.apple.com; num wifi ruim o codesign falha. Não derrubar o build
    # por isso — cair para ad-hoc avisando.
    echo "     ⚠ falhou assinar com Developer ID (detalhe em $BUILD/codesign.log)"
    echo "       Causa comum: sem internet — o --timestamp precisa de rede."
    echo "       Caindo para ad-hoc para não quebrar o build."
    SIGN_ID=""
  fi
fi

if [ -z "$SIGN_ID" ]; then
  codesign --force --sign - "$APP" >/dev/null 2>&1 \
    && echo "     assinado (ad-hoc — serve para usar aqui, não para distribuir)" \
    || echo "     aviso: codesign ad-hoc falhou — o app ainda roda"
  echo "     ⚠ sem certificado 'Developer ID Application' no chaveiro."
  echo "       O testador vai precisar do ritual \"Abrir Mesmo Assim\"."
fi

echo
echo "✓ Pronto:  $APP"
if [ -n "$AI_ENDPOINT" ]; then
  echo "  IA: endpoint = $AI_ENDPOINT"
else
  echo "  IA: nenhum endpoint — usando fallback heurístico local."
  echo "      Para ligar a IA real depois (sem rebuild):"
  echo "      defaults write $BUNDLE_ID CatedraAIEndpoint 'https://SEU-DEPLOY.vercel.app/api/complete'"
fi
echo "  Abrir:   open \"$APP\""
echo "  Instalar: arraste $NAME.app para /Applications"
