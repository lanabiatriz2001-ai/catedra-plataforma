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
AI_ENDPOINT="${CATEDRA_AI_ENDPOINT:-}"
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
swiftc -O -target "$TARGET" $LEGIS_SOURCES $JURIS_SOURCES "$HERE/Sources/main.swift" -o "$BUILD/$EXEC" \
  -framework Cocoa -framework WebKit -framework UserNotifications -framework SwiftUI \
  -framework Network -framework PDFKit

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
  <key>CatedraAIEndpoint</key><string>$AI_ENDPOINT</string>
  <key>CatedraGeminiKey</key><string>$GEMINI_KEY</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.education</string>
</dict>
</plist>
PLIST

echo "→ 5/5  Assinando (ad-hoc)…"
codesign --force --deep --sign - "$APP" >/dev/null 2>&1 \
  && echo "     assinado (ad-hoc)" \
  || echo "     aviso: codesign ad-hoc falhou — o app ainda roda"

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
