#!/usr/bin/env bash
# build-ipad.sh — monta o Cátedra.app para iPadOS a partir do mesmo bundle web do Mac.
#
#   bash ios/build-ipad.sh              # simulador (padrão) — instala e abre
#   bash ios/build-ipad.sh device       # iPad de verdade (exige perfil de provisionamento)
#
# Por que sem projeto Xcode: o app do Mac já é montado assim (swiftc + bundle à mão), e
# manter o mesmo estilo evita um .xcodeproj que ninguém edita e que vive dando conflito.
#
# DIFERENÇA que pega quem vem do macOS: o .app do iOS é PLANO. O executável e o
# Info.plist ficam na RAIZ do bundle — não existe Contents/MacOS aqui. Montar no formato
# do Mac faz o simulador recusar a instalação com uma mensagem pouco útil.
set -euo pipefail

ALVO="${1:-sim}"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
BUILD="$HERE/build"
NAME="Cátedra"
EXEC="Catedra"
BUNDLE_ID="com.catedra.ipad"
APP="$BUILD/$NAME.app"
MIN_IOS=17.0
AI_ENDPOINT="${CATEDRA_AI_ENDPOINT:-https://catedra-plataforma.vercel.app/api/complete}"

mkdir -p "$BUILD"

echo "→ 1/4  Gerando bundle web (Catedra.dc.html → mac/build/web)…"
node "$ROOT/scripts/build-macos.mjs" >/dev/null
echo "     $(du -sh "$ROOT/mac/build/web" | cut -f1) de conteúdo web"

echo "→ 2/4  Compilando Swift para iPadOS ($ALVO)…"
if [ "$ALVO" = "device" ]; then
  SDK="$(xcrun --sdk iphoneos --show-sdk-path)"
  TARGET="arm64-apple-ios$MIN_IOS"
  PLATAFORMA="iPhoneOS"; DTPLATFORM="iphoneos"
else
  SDK="$(xcrun --sdk iphonesimulator --show-sdk-path)"
  # O simulador em Apple Silicon é arm64 COM o sufixo -simulator: sem ele o binário é
  # de device e o simctl instala mas o app não abre.
  TARGET="arm64-apple-ios$MIN_IOS-simulator"
  PLATAFORMA="iPhoneSimulator"; DTPLATFORM="iphonesimulator"
fi
rm -rf "$APP"; mkdir -p "$APP"
swiftc -O -target "$TARGET" -sdk "$SDK" $(find "$HERE/vendor" -name "*.swift") "$HERE/Sources/main.swift" -o "$APP/$EXEC" \
  -framework UIKit -framework WebKit -framework UserNotifications

echo "→ 3/4  Montando $NAME.app (bundle PLANO do iOS)…"
cp -R "$ROOT/mac/build/web" "$APP/web"
cat > "$APP/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>$NAME</string>
  <key>CFBundleDisplayName</key><string>$NAME</string>
  <key>CFBundleExecutable</key><string>$EXEC</string>
  <key>CFBundleIdentifier</key><string>$BUNDLE_ID</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>MinimumOSVersion</key><string>$MIN_IOS</string>
  <!-- 2 = iPad. Só iPad de propósito: o layout do app troca para "celular" abaixo de
       900px e num iPhone ficaria apertado demais para a tabela do ciclo. -->
  <key>UIDeviceFamily</key><array><integer>2</integer></array>
  <!-- Sem UILaunchScreen o iOS 14+ roda o app em modo compatibilidade (letterboxed,
       com barras pretas e resolução errada). É a pegadinha mais comum aqui. -->
  <key>UILaunchScreen</key><dict/>
  <key>UISupportedInterfaceOrientations~ipad</key>
  <array>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationPortraitUpsideDown</string>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
  </array>
  <key>UIRequiresFullScreen</key><false/>
  <key>CFBundleSupportedPlatforms</key><array><string>$PLATAFORMA</string></array>
  <key>DTPlatformName</key><string>$DTPLATFORM</string>
  <!-- O conteúdo vem de file:// dentro do app; as chamadas de rede (Supabase e IA) são
       todas HTTPS, então não é preciso afrouxar o ATS. -->
  <key>CatedraAIEndpoint</key><string>$AI_ENDPOINT</string>
  <key>UIFileSharingEnabled</key><true/>
  <key>LSSupportsOpeningDocumentsInPlace</key><true/>
</dict>
</plist>
PLIST
# CátedraJURIS nativo: o acervo é um corpus.json EMBUTIDO no bundle. O build do Mac já
# fazia isso; aqui faltava, e sem ele a aba CátedraJURIS do iPad abria com
# "corpus.json não encontrado no bundle". No iOS o bundle é PLANO, então os arquivos vão
# na RAIZ do .app — é lá que Bundle.main.url(forResource:) procura.
JURIS_RES="$HOME/App Jurisprudências/VadeMecumJuris/Sources/VadeMecum/Resources"
for f in corpus.json notas.json indice.json; do
  if [ -f "$JURIS_RES/$f" ]; then cp "$JURIS_RES/$f" "$APP/$f"
  else echo "     ⚠ $f não encontrado em $JURIS_RES — a aba CátedraJURIS vai abrir sem acervo"; fi
done
# A Central de Contas (TCU + TCEs) é gerada NESTE repo, dos mesmos dados que a web usa.
[ -f "$ROOT/corpus-contas.json" ] && cp "$ROOT/corpus-contas.json" "$APP/corpus-contas.json"
[ -f "$ROOT/incidencia.json" ] && cp "$ROOT/incidencia.json" "$APP/incidencia.json"
[ -f "$ROOT/incidencia-verbetes.json" ] && cp "$ROOT/incidencia-verbetes.json" "$APP/incidencia-verbetes.json"
# Banco de discursivas/peças (scripts/build-discursivas-nativo.mjs -> discursivas.json): alimenta o Simulado.
[ -f "$ROOT/discursivas.json" ] && cp "$ROOT/discursivas.json" "$APP/discursivas.json"
echo "     acervo do JURIS: $(ls -1 "$APP"/corpus*.json "$APP"/notas.json "$APP"/indice.json 2>/dev/null | wc -l | tr -d ' ') arquivo(s)"

plutil -lint "$APP/Info.plist" >/dev/null && echo "     Info.plist válido"

if [ "$ALVO" = "device" ]; then
  echo "→ 4/4  Assinando para dispositivo…"
  IOS_ID="$(security find-identity -v -p codesigning 2>/dev/null | grep -E 'Apple Development|Apple Distribution' | head -1 | sed -E 's/.*"(.*)"/\1/' || true)"
  if [ -z "$IOS_ID" ]; then
    echo "     ✗ Nenhum certificado de iOS no chaveiro."
    echo "       Para instalar no iPad de verdade é preciso 'Apple Development' + um PERFIL"
    echo "       DE PROVISIONAMENTO com o UDID do aparelho registrado (feito pelo Xcode)."
    exit 1
  fi
  # O perfil de provisionamento é o que autoriza ESTE app a rodar NAQUELE iPad. Basta
  # baixar o .mobileprovision do portal e deixá-lo em ios/embedded.mobileprovision —
  # daqui para a frente o script cuida de tudo.
  PERFIL="$HERE/embedded.mobileprovision"
  if [ -f "$PERFIL" ]; then
    cp "$PERFIL" "$APP/embedded.mobileprovision"
    # Os entitlements TÊM de bater com o perfil (application-identifier, team-identifier,
    # get-task-allow). Em vez de escrevê-los à mão e errar, extraímos do próprio perfil:
    # o .mobileprovision é um CMS assinado, e `security cms -D` devolve o plist de dentro.
    security cms -D -i "$PERFIL" > "$BUILD/perfil.plist" 2>/dev/null
    /usr/libexec/PlistBuddy -x -c "Print :Entitlements" "$BUILD/perfil.plist" > "$BUILD/app.entitlements" 2>/dev/null
    if [ -s "$BUILD/app.entitlements" ]; then
      codesign --force --sign "$IOS_ID" --entitlements "$BUILD/app.entitlements" --timestamp=none "$APP"
      echo "     assinado com perfil: $(/usr/libexec/PlistBuddy -c 'Print :Name' "$BUILD/perfil.plist" 2>/dev/null)"
      echo "     expira em: $(/usr/libexec/PlistBuddy -c 'Print :ExpirationDate' "$BUILD/perfil.plist" 2>/dev/null)"
      echo
      echo "  Instalar no iPad (precisa estar plugado e destravado):"
      echo "      xcrun devicectl device install app --device <UDID> \"$APP\""
    else
      echo "     ✗ não consegui ler os entitlements do perfil — ele está íntegro?"
    fi
  else
    codesign --force --sign "$IOS_ID" --timestamp=none "$APP"
    echo "     assinado com: $IOS_ID (SEM perfil — não instala em iPad de verdade)"
    echo
    echo "  Falta o perfil de provisionamento. No portal da Apple (developer.apple.com):"
    echo "    1. Identifiers → + → App IDs → App → Bundle ID: $BUNDLE_ID"
    echo "    2. Devices    → + → registrar o iPad (o UDID já é conhecido deste Mac)"
    echo "    3. Profiles   → + → iOS App Development → escolher o App ID, o certificado"
    echo "       'Apple Development' e o iPad → Generate → Download"
    echo "    4. Salvar o arquivo como: $PERFIL"
    echo "    5. Rodar de novo: bash ios/build-ipad.sh device"
  fi
else
  echo "→ 4/4  Instalando no simulador…"
  # Usa o simulador já ligado; se não houver, liga um iPad.
  DEV="$(xcrun simctl list devices booted -j | python3 -c 'import sys,json; d=json.load(sys.stdin)["devices"]; print(next((x["udid"] for v in d.values() for x in v if "iPad" in x["name"]), ""))')"
  if [ -z "$DEV" ]; then
    DEV="$(xcrun simctl list devices available -j | python3 -c 'import sys,json; d=json.load(sys.stdin)["devices"]; print(next((x["udid"] for v in d.values() for x in v if "iPad" in x["name"]), ""))')"
    [ -n "$DEV" ] && xcrun simctl boot "$DEV" && sleep 6
  fi
  [ -n "$DEV" ] || { echo "     ✗ Nenhum simulador de iPad disponível."; exit 1; }
  xcrun simctl install "$DEV" "$APP"
  xcrun simctl launch "$DEV" "$BUNDLE_ID" >/dev/null
  echo "     instalado e aberto no simulador ($DEV)"
fi

echo
echo "✓ Pronto: $APP"
