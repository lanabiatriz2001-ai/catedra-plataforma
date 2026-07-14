#!/usr/bin/env bash
# build-widget.sh — ATIVA o widget do macOS sobre um Cátedra.app já montado.
#
# NÃO é chamado pelo build-app.sh normal (que fica ad-hoc, saudável, sem widget).
# Rode este script SÓ quando tiver uma identidade de assinatura Developer com um
# PERFIL DE PROVISIONAMENTO que autorize o App Group — o que, na prática, quer
# dizer conta paga do Apple Developer Program (conta grátis emite perfis de 7
# dias, então o widget/app expirariam toda semana).
#
# Passo a passo:
#   1) bash mac/build-app.sh                      # monta o app (ad-hoc)
#   2) CATEDRA_SIGN_ID="Developer ID Application: SEU NOME (TEAMID)" \
#      CATEDRA_APP_PROFILE="/caminho/Catedra.provisionprofile" \
#      CATEDRA_WIDGET_PROFILE="/caminho/CatedraWidget.provisionprofile" \
#      bash mac/Widget/build-widget.sh
#
# Sem os perfis (só p/ testar a montagem): rode com CATEDRA_SIGN_ID apenas —
# ele assina sem embutir perfil (o widget provavelmente NÃO registrará sem o
# perfil de App Group; serve só para validar a compilação/estrutura).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"       # mac/Widget
MAC="$(cd "$HERE/.." && pwd)"               # mac
BUILD="$MAC/build"
NAME="Cátedra"
APP="$BUILD/$NAME.app"
BUNDLE_ID="com.catedra.desktop"
WIDGET_EXEC="CatedraWidget"
WIDGET_BID="$BUNDLE_ID.widget"
TARGET="arm64-apple-macos14.0"
APPEX="$APP/Contents/PlugIns/$WIDGET_EXEC.appex"

SIGN_ID="${CATEDRA_SIGN_ID:-}"
APP_PROFILE="${CATEDRA_APP_PROFILE:-}"
WIDGET_PROFILE="${CATEDRA_WIDGET_PROFILE:-}"

if [ ! -d "$APP" ]; then
  echo "✗ $APP não existe. Rode 'bash mac/build-app.sh' primeiro." >&2
  exit 1
fi
if [ -z "$SIGN_ID" ]; then
  echo "✗ Defina CATEDRA_SIGN_ID (ex.: 'Developer ID Application: Nome (TEAMID)')." >&2
  echo "  Identidades disponíveis:" >&2
  security find-identity -v -p codesigning >&2 || true
  exit 1
fi

echo "→ 1/5  Compilando a extensão de widget (WidgetKit)…"
# -parse-as-library: sem isso, um único .swift com @main é lido como script e o
# @main é recusado ('main attribute cannot be used in a module with top-level code').
swiftc -O -target "$TARGET" -parse-as-library "$HERE/$WIDGET_EXEC.swift" \
  -o "$BUILD/$WIDGET_EXEC" -framework WidgetKit -framework SwiftUI

echo "→ 2/5  Montando a .appex em Contents/PlugIns…"
rm -rf "$APPEX"
mkdir -p "$APPEX/Contents/MacOS"
cp "$BUILD/$WIDGET_EXEC" "$APPEX/Contents/MacOS/$WIDGET_EXEC"
printf 'XPC!????' > "$APPEX/Contents/PkgInfo"
cat > "$APPEX/Contents/Info.plist" <<WPLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>$WIDGET_EXEC</string>
  <key>CFBundleDisplayName</key><string>Cátedra</string>
  <key>CFBundleExecutable</key><string>$WIDGET_EXEC</string>
  <key>CFBundleIdentifier</key><string>$WIDGET_BID</string>
  <key>CFBundlePackageType</key><string>XPC!</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key><string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>
WPLIST

echo "→ 3/5  Embutindo perfis de provisionamento (se fornecidos)…"
if [ -n "$WIDGET_PROFILE" ]; then
  cp "$WIDGET_PROFILE" "$APPEX/Contents/embedded.provisionprofile"
  echo "     widget: $WIDGET_PROFILE"
else
  echo "     (sem CATEDRA_WIDGET_PROFILE — o widget provavelmente não registrará)"
fi
if [ -n "$APP_PROFILE" ]; then
  cp "$APP_PROFILE" "$APP/Contents/embedded.provisionprofile"
  echo "     app:    $APP_PROFILE"
else
  echo "     (sem CATEDRA_APP_PROFILE — o App Group do app pode não ser autorizado)"
fi

echo "→ 4/5  Assinando a .appex e depois o app (ordem: aninhado → externo)…"
# Cada bundle com o SEU entitlement de App Group. Nada de --deep no app externo,
# senão ele re-assinaria a .appex sem o entitlement/perfil dela.
codesign --force --timestamp --options runtime \
  --sign "$SIGN_ID" --entitlements "$HERE/Widget.entitlements" \
  --generate-entitlement-der "$APPEX"
codesign --force --timestamp --options runtime \
  --sign "$SIGN_ID" --entitlements "$MAC/Catedra.entitlements" \
  --generate-entitlement-der "$APP"

echo "→ 5/5  Verificando…"
codesign -v --strict "$APPEX" && echo "     .appex: assinatura OK"
codesign -v --strict "$APP"   && echo "     app:    assinatura OK"
echo "     Registro do widget (pode levar alguns segundos):"
LSREG="/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister"
"$LSREG" -f "$APP" >/dev/null 2>&1 || true
sleep 2
if pluginkit -m 2>/dev/null | grep -qi "$WIDGET_BID"; then
  echo "     ✓ widget REGISTRADO — deve aparecer na galeria de widgets."
else
  echo "     ⚠ widget ainda não registrado. Confira: perfil válido (não expirado),"
  echo "       App Group autorizado no perfil, e app em local não-translocado."
fi

echo
echo "✓ Concluído. Abra a galeria de widgets (clique na data/hora → Editar widgets) e procure 'Cátedra'."
