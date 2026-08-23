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
# sim         → simulador (padrão)
# device      → iPad de verdade, perfil de DESENVOLVIMENTO (só os aparelhos registrados)
# testflight  → .ipa assinado para DISTRIBUIÇÃO, pronto para subir ao App Store Connect
[ "$ALVO" = "testflight" ] && ALVO_REAL="testflight" || ALVO_REAL="$ALVO"
[ "$ALVO" = "testflight" ] && ALVO="device"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
BUILD="$HERE/build"
NAME="Cátedra"
EXEC="Catedra"
BUNDLE_ID="com.catedra.ipad"
APP="$BUILD/$NAME.app"
MIN_IOS=17.0
# Número do build. A Apple recusa reenviar a mesma versão ("The bundle version must be higher
# than the previously uploaded version"), então ele precisa subir sozinho — número fixo dá um
# 409 no meio do upload e faz perder a viagem. A contagem de commits serve bem: sobe a cada
# commit, é reproduzível e não depende de guardar estado em lugar nenhum.
BUILD_N="${CATEDRA_BUILD_N:-$(git -C "$ROOT" rev-list --count HEAD 2>/dev/null || echo 1)}"

# A Apple RECUSA upload feito com SDK beta ("Unsupported SDK or Xcode version", 90534). Esta
# máquina tem os dois Xcode e o `xcode-select` aponta para o beta — ótimo para desenvolver,
# inútil para publicar. No modo testflight usamos o estável só nesta execução, sem mexer no
# xcode-select global (que exigiria senha).
if [ "$ALVO_REAL" = "testflight" ] && [ -d /Applications/Xcode.app/Contents/Developer ]; then
  export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
  echo "     usando o Xcode estável: $(xcodebuild -version 2>/dev/null | head -1) (SDK iOS $(xcrun --sdk iphoneos --show-sdk-version 2>/dev/null))"
fi
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
# Valores das chaves DT*, lidos do Xcode que está em uso nesta execução.
DT_SDK_VER="$(xcrun --sdk iphoneos --show-sdk-version 2>/dev/null || echo 26.5)"
DT_SDK_BUILD="$(/usr/libexec/PlistBuddy -c 'Print :ProductBuildVersion' "$(xcrun --sdk iphoneos --show-sdk-path)/System/Library/CoreServices/SystemVersion.plist" 2>/dev/null || echo 23F81a)"
DT_XCODE_BUILD="$(xcodebuild -version 2>/dev/null | tail -1 | awk '{print $3}')"
DT_XCODE="$(xcodebuild -version 2>/dev/null | head -1 | awk '{print $2}' | awk -F. '{printf "%d%d0", $1, ($2==""?0:$2)}')"
DT_MAC_BUILD="$(sw_vers -buildVersion 2>/dev/null)"

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
  <key>CFBundleVersion</key><string>$BUILD_N</string>
  <!-- Binário de 64 bits precisa declarar arm64 aqui, senão o App Store Connect recusa
       com "Invalid Bundle ... has a 64-bit architecture slice" (90502). -->
  <key>UIRequiredDeviceCapabilities</key><array><string>arm64</string></array>
  <!-- As chaves DT* são a "certidão de nascimento" do build: é por elas que o App Store
       Connect descobre com que Xcode e SDK o app foi feito. Um Info.plist escrito à mão não
       as tem, e sem elas a Apple responde 90534 ("Unsupported SDK or Xcode version") mesmo
       quando o binário foi compilado com o SDK certo. São preenchidas do Xcode em uso. -->
  <key>DTPlatformVersion</key><string>$DT_SDK_VER</string>
  <key>DTSDKName</key><string>iphoneos$DT_SDK_VER</string>
  <key>DTSDKBuild</key><string>$DT_SDK_BUILD</string>
  <key>DTPlatformBuild</key><string>$DT_SDK_BUILD</string>
  <key>DTXcode</key><string>$DT_XCODE</string>
  <key>DTXcodeBuild</key><string>$DT_XCODE_BUILD</string>
  <key>DTCompiler</key><string>com.apple.compilers.llvm.clang.1_0</string>
  <key>CFBundleIconName</key><string>AppIcon</string>
  <key>BuildMachineOSBuild</key><string>$DT_MAC_BUILD</string>
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
  <!-- Ícone: PNGs na raiz do bundle (sem asset catalog). iOS acrescenta @2x/@3x sozinho. -->
  <key>CFBundleIcons</key><dict><key>CFBundlePrimaryIcon</key><dict>
    <key>CFBundleIconFiles</key><array><string>AppIcon60x60</string><string>AppIcon76x76</string><string>AppIcon83.5x83.5</string></array>
  </dict></dict>
  <key>CFBundleIcons~ipad</key><dict><key>CFBundlePrimaryIcon</key><dict>
    <key>CFBundleIconFiles</key><array><string>AppIcon60x60</string><string>AppIcon76x76</string><string>AppIcon83.5x83.5</string></array>
  </dict></dict>
</dict>
</plist>
PLIST
# ── Ícone: mesmo renderizador do Mac (mac/Sources/icon.swift → iconset 16…1024), depois os
#    tamanhos que o iPad usa. Antes o app chegava ao iPad sem logo nenhuma.
ICONSET="$BUILD/Catedra.iconset"; rm -rf "$ICONSET"; mkdir -p "$ICONSET"
if swiftc -O -target arm64-apple-macos14.0 "$ROOT/mac/Sources/icon.swift" -o "$BUILD/makeicon" -framework AppKit 2>/dev/null \
   && "$BUILD/makeicon" "$ICONSET" >/dev/null 2>&1 && [ -f "$ICONSET/icon_512x512@2x.png" ]; then
  for par in "AppIcon60x60@2x:120" "AppIcon60x60@3x:180" "AppIcon76x76@2x:152" "AppIcon83.5x83.5@2x:167" "AppIcon76x76:76"; do
    nome="${par%%:*}"; px="${par##*:}"
    sips -z "$px" "$px" "$ICONSET/icon_512x512@2x.png" --out "$APP/$nome.png" >/dev/null 2>&1
  done
  echo "     ícone: $(ls "$APP"/AppIcon*.png 2>/dev/null | wc -l | tr -d ' ') PNG(s)"

  # PNG solto basta para instalar no iPad, mas NÃO para o App Store Connect: desde o SDK
  # do iOS 11 ele exige um CATÁLOGO DE ATIVOS compilado (Assets.car) e a chave
  # CFBundleIconName — sem os dois, responde 90713. O actool é quem compila o catálogo e
  # ainda escreve a chave num plist parcial, que fundimos no Info.plist.
  CAT="$BUILD/Assets.xcassets"; SET="$CAT/AppIcon.appiconset"
  rm -rf "$CAT"; mkdir -p "$SET"
  # O ícone grande da loja NÃO pode ter transparência (90717). O nosso é gerado com canal
  # alfa; aqui ele é achatado sobre fundo opaco. Os demais tamanhos podem manter o alfa.
  sips -z 1024 1024 "$ICONSET/icon_512x512@2x.png" --out "$BUILD/icon-1024-alfa.png" >/dev/null 2>&1
  sips -s format jpeg -s formatOptions best "$BUILD/icon-1024-alfa.png" --out "$BUILD/icon-1024.jpg" >/dev/null 2>&1
  sips -s format png "$BUILD/icon-1024.jpg" --out "$SET/icon-1024.png" >/dev/null 2>&1
  for par in "icon-76:76" "icon-76@2x:152" "icon-83.5@2x:167" "icon-60@2x:120" "icon-60@3x:180" "icon-40@2x:80" "icon-40@3x:120" "icon-29@2x:58" "icon-29@3x:87" "icon-20@2x:40" "icon-20@3x:60"; do
    sips -z "${par##*:}" "${par##*:}" "$ICONSET/icon_512x512@2x.png" --out "$SET/${par%%:*}.png" >/dev/null 2>&1
  done
  cat > "$SET/Contents.json" <<'JSONEOF'
{ "images": [
  {"idiom":"iphone","size":"20x20","scale":"2x","filename":"icon-20@2x.png"},
  {"idiom":"iphone","size":"20x20","scale":"3x","filename":"icon-20@3x.png"},
  {"idiom":"iphone","size":"29x29","scale":"2x","filename":"icon-29@2x.png"},
  {"idiom":"iphone","size":"29x29","scale":"3x","filename":"icon-29@3x.png"},
  {"idiom":"iphone","size":"40x40","scale":"2x","filename":"icon-40@2x.png"},
  {"idiom":"iphone","size":"40x40","scale":"3x","filename":"icon-40@3x.png"},
  {"idiom":"iphone","size":"60x60","scale":"2x","filename":"icon-60@2x.png"},
  {"idiom":"iphone","size":"60x60","scale":"3x","filename":"icon-60@3x.png"},
  {"idiom":"ipad","size":"20x20","scale":"1x","filename":"icon-20@2x.png"},
  {"idiom":"ipad","size":"20x20","scale":"2x","filename":"icon-40@2x.png"},
  {"idiom":"ipad","size":"29x29","scale":"1x","filename":"icon-29@2x.png"},
  {"idiom":"ipad","size":"29x29","scale":"2x","filename":"icon-29@3x.png"},
  {"idiom":"ipad","size":"40x40","scale":"1x","filename":"icon-40@2x.png"},
  {"idiom":"ipad","size":"40x40","scale":"2x","filename":"icon-40@3x.png"},
  {"idiom":"ipad","size":"76x76","scale":"1x","filename":"icon-76.png"},
  {"idiom":"ipad","size":"76x76","scale":"2x","filename":"icon-76@2x.png"},
  {"idiom":"ipad","size":"83.5x83.5","scale":"2x","filename":"icon-83.5@2x.png"},
  {"idiom":"ios-marketing","size":"1024x1024","scale":"1x","filename":"icon-1024.png"}
], "info": {"version":1,"author":"catedra"} }
JSONEOF
  echo '{ "info": {"version":1,"author":"catedra"} }' > "$CAT/Contents.json"
  if actool --output-format human-readable-text --notices --warnings \
       --app-icon AppIcon --output-partial-info-plist "$BUILD/icon-partial.plist" \
       --target-device ipad --minimum-deployment-target "$MIN_IOS" \
       --platform iphoneos --compile "$APP" "$CAT" >/dev/null 2>&1 && [ -f "$APP/Assets.car" ]; then
    echo "     catálogo de ativos: Assets.car ($(du -h "$APP/Assets.car" | cut -f1 | tr -d ' '))"
    # FUNDIR o plist parcial do actool, em vez de escrever a chave à mão. Ele não devolve
    # só `CFBundleIconName` solto: devolve `CFBundleIcons` e `CFBundleIcons~ipad` com o
    # CFBundleIconName DENTRO de CFBundlePrimaryIcon — e é ali que o App Store Connect
    # procura. Com a chave só no topo, ele responde 90713 dizendo que ela não existe.
    # O Merge do PlistBuddy NÃO sobrescreve chave que já existe, e o plist traz as duas
    # escritas à mão — então elas saem antes.
    /usr/libexec/PlistBuddy -c "Delete :CFBundleIcons" "$APP/Info.plist" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Delete :CFBundleIcons~ipad" "$APP/Info.plist" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Merge $BUILD/icon-partial.plist" "$APP/Info.plist" 2>/dev/null \
      && echo "     ícones declarados pelo actool (CFBundleIcons + ~ipad)"
  else
    echo "     ⚠ actool não compilou o catálogo — o App Store Connect vai recusar (90713)"
  fi
else
  echo "     ⚠ ícone não gerado (icon.swift/makeicon) — o app vai sem logo"
fi
# CátedraJURIS nativo: o acervo é um corpus.json EMBUTIDO no bundle. O build do Mac já
# fazia isso; aqui faltava, e sem ele a aba CátedraJURIS do iPad abria com
# "corpus.json não encontrado no bundle". No iOS o bundle é PLANO, então os arquivos vão
# na RAIZ do .app — é lá que Bundle.main.url(forResource:) procura.
# ---------------------------------------------------------------------------------
# Copia de asset declarado por uma tela. O padrao antigo era `[ -f x ] && cp x y`:
# arquivo faltando = app publicado quebrado, EM SILENCIO, e a usuaria descobria vendo o
# nome de um .json na tela. Aqui a falta e barulhenta.
#   copiar_asset  <origem>  <destino>  <exigido|opcional>  <o que quebra sem ele>
# ---------------------------------------------------------------------------------
copiar_asset() {
  local origem="$1" destino="$2" nivel="$3" quebra="$4"
  if [ -f "$origem" ]; then cp "$origem" "$destino"; return 0; fi
  if [ "$nivel" = "exigido" ]; then
    echo "  ✗ FALTA $(basename "$origem") — $quebra" >&2
    echo "    (gere-o antes de publicar; o app nao pode sair sem ele)" >&2
    exit 1
  fi
  echo "     ⚠ $(basename "$origem") ausente — $quebra"
}

JURIS_RES="$HOME/App Jurisprudências/VadeMecumJuris/Sources/VadeMecum/Resources"
for f in corpus.json notas.json indice.json; do
  copiar_asset "$JURIS_RES/$f" "$APP/$f" opcional \
    "a aba CátedraJURIS abre sem acervo (o repo do Vade Mecum não está nesta máquina)"
done
# A Central de Contas (TCU + TCEs) é gerada NESTE repo, dos mesmos dados que a web usa.
copiar_asset "$ROOT/corpus-contas.json" "$APP/corpus-contas.json" exigido "a Central de Contas (TCU + TCEs) abre vazia"
copiar_asset "$ROOT/incidencia.json" "$APP/incidencia.json" exigido "o mapa de incidência por artigo do LEGIS fica sem dado"
copiar_asset "$ROOT/incidencia-verbetes.json" "$APP/incidencia-verbetes.json" exigido "a incidência de verbetes some do JURIS"
# Banco de discursivas/peças (scripts/build-discursivas-nativo.mjs -> discursivas.json): alimenta o Simulado.
copiar_asset "$ROOT/discursivas.json" "$APP/discursivas.json" exigido "o Simulado de discursivas abre sem banco"
# Material oficial de prova oral (scripts/build-oral.mjs -> oral.json).
copiar_asset "$ROOT/oral.json" "$APP/oral.json" exigido "a tela Oral · bancas reais abre sem concurso nenhum"
echo "     acervo do JURIS: $(ls -1 "$APP"/corpus*.json "$APP"/notas.json "$APP"/indice.json 2>/dev/null | wc -l | tr -d ' ') arquivo(s)"

# Conformidade de exportação. Sem esta chave, cada build fica parado no TestFlight
# esperando alguém responder um formulário sobre criptografia.
#
# Verificado no código (22/08/2026), não presumido: os 194 arquivos Swift importam CryptoKit
# em 2 lugares, e o único uso é SHA256.hash() como impressão digital do texto de uma lei, para
# saber se o Planalto mudou a norma — hash, não cifra. O binário não linka OpenSSL, libsodium
# nem BoringSSL. No bundle web, `crypto.subtle` aparece só dentro da biblioteca do Supabase,
# para o desafio PKCE (hash) e a verificação de assinatura do JWT (autenticação). O backup
# em iCloud/Drive sai como JSON em texto puro. Toda a rede é HTTPS do sistema.
#
# Isso cai nas isenções: criptografia do próprio sistema operacional e uso restrito a
# autenticação. Se um dia o app passar a CIFRAR dado (backup cifrado, ponta a ponta), esta
# linha precisa sair e a resposta muda.
/usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" "$APP/Info.plist" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :ITSAppUsesNonExemptEncryption false" "$APP/Info.plist"

plutil -lint "$APP/Info.plist" >/dev/null && echo "     Info.plist válido"

if [ "$ALVO" = "device" ]; then
  echo "→ 4/4  Assinando para dispositivo…"
  # O certificado depende do destino: Development instala no iPad registrado;
  # Distribution é o único que o App Store Connect aceita. Escolher "o primeiro da
  # lista" pegava sempre o Development — e o TestFlight recusa em silêncio.
  if [ "$ALVO_REAL" = "testflight" ]; then PADRAO_CERT='Apple Distribution'; else PADRAO_CERT='Apple Development'; fi
  IOS_ID="$(security find-identity -v -p codesigning 2>/dev/null | grep -E "$PADRAO_CERT" | head -1 | sed -E 's/^[^"]*"([^"]+)".*$/\1/')"
  if [ -z "$IOS_ID" ]; then
    echo "     ✗ Nenhum certificado de iOS no chaveiro."
    echo "       Para instalar no iPad de verdade é preciso 'Apple Development' + um PERFIL"
    echo "       DE PROVISIONAMENTO com o UDID do aparelho registrado (feito pelo Xcode)."
    exit 1
  fi
  # O perfil de provisionamento é o que autoriza ESTE app a rodar NAQUELE iPad. Basta
  # baixar o .mobileprovision do portal e deixá-lo em ios/embedded.mobileprovision —
  # daqui para a frente o script cuida de tudo.
  # O perfil também muda: o de desenvolvimento traz a lista de UDIDs; o de loja traz
  # `beta-reports-active`, que é o que o TestFlight exige.
  if [ "$ALVO_REAL" = "testflight" ]; then
    PERFIL="$HERE/appstore.mobileprovision"
    if [ ! -f "$PERFIL" ]; then
      ACHADO="$(grep -rl 'beta-reports-active' "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles/" 2>/dev/null | head -1)"
      [ -n "$ACHADO" ] && PERFIL="$ACHADO"
    fi
  else
    PERFIL="$HERE/embedded.mobileprovision"
  fi
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
      if [ "$ALVO_REAL" = "testflight" ]; then
        # O App Store Connect não recebe um .app solto: quer um zip com o bundle dentro de
        # uma pasta chamada Payload/, com a extensão .ipa. É só isso — não há mágica aqui.
        IPA="$BUILD/Catedra.ipa"
        rm -rf "$BUILD/Payload" "$IPA"
        mkdir -p "$BUILD/Payload"
        cp -R "$APP" "$BUILD/Payload/"
        ( cd "$BUILD" && zip -qry "$IPA" Payload )
        rm -rf "$BUILD/Payload"
        echo "     empacotado: $IPA ($(du -h "$IPA" | cut -f1 | tr -d ' '))"
        echo
        echo "  Subir para o TestFlight (precisa da chave da API do App Store Connect):"
        echo "      xcrun altool --upload-app -f \"$IPA\" -t ios \\"
        echo "        --apiKey <KEY_ID> --apiIssuer <ISSUER_ID>"
        echo
        echo "  A chave (.p8) fica em ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8"
        echo "  Gere em: App Store Connect → Users and Access → Integrations → App Store Connect API"
      else
        echo "  Instalar no iPad (precisa estar plugado e destravado):"
        echo "      xcrun devicectl device install app --device <UDID> \"$APP\""
      fi
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
