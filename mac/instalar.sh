#!/bin/bash
# Instala mac/build/Cátedra.app em /Applications.
#
# O nome da pasta vai com o acento DECOMPOSTO ("a" + U+0301). Com o "á" composto (como sai do teclado), o
# runningboardd não acha o registro do widget no LaunchServices ("Unable to find this application extension
# record", -10814) e o chronod nunca abre a extensão: o widget some da galeria. Descoberto em 02/10/2026.
# O APFS trata as duas formas como o MESMO nome, então o rm abaixo apaga a instalação antiga em qualquer forma.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ORIGEM="${1:-$HERE/build/Cátedra.app}"
NOME="$(printf 'Ca\xcc\x81tedra.app')"
DESTINO="/Applications/$NOME"
LSREG=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister

[ -d "$ORIGEM" ] || { echo "✗ não achei $ORIGEM (rode bash mac/build-app.sh antes)"; exit 1; }
osascript -e 'quit app "Cátedra"' >/dev/null 2>&1 || true
sleep 1
"$LSREG" -u "$DESTINO" >/dev/null 2>&1 || true
rm -rf "$DESTINO"
ditto --norsrc --noextattr --noacl "$ORIGEM" "$DESTINO"
"$LSREG" -f -R "$DESTINO"
WIDGET="$DESTINO/Contents/PlugIns/CatedraWidget.appex"
if [ -d "$WIDGET" ]; then
  pluginkit -a "$WIDGET" || true
  killall chronod >/dev/null 2>&1 || true
  echo "✓ instalado em /Applications (com o widget)"
else
  echo "✓ instalado em /Applications (sem widget neste build)"
fi
