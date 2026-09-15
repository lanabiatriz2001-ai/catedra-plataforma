#!/usr/bin/env bash
# build-app.sh — monta o Cátedra.app (nativo macOS) a partir do Catedra.dc.html.
#
#   bash mac/build-app.sh
#   CATEDRA_SO_ARM64=1 bash mac/build-app.sh   # só a fatia arm64 (metade do tempo; ver abaixo)
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

# Trava de build cruzado: dois builds do MESMO alvo se atropelam (já saiu .app sem a
# fatia Intel por causa disso). Mac × iPad em paralelo continua liberado.
# shellcheck source=../scripts/guarda-build.sh
source "$ROOT/scripts/guarda-build.sh"
ct_travar_build macos "$ROOT"
# Assinatura numa cópia fora da pasta sincronizada (iCloud), com --verify --strict lá.
# shellcheck source=../scripts/assinar-app.sh
source "$ROOT/scripts/assinar-app.sh"
BUILD="$HERE/build"
NAME="Cátedra"
EXEC="Catedra"
BUNDLE_ID="com.catedra.desktop"
APP="$BUILD/$NAME.app"
# Endpoint de IA padrão = a produção na Vercel. Antes vinha VAZIO, então o app saía com
# a IA morta e dizia "a IA não respondeu" — quem recebia o app achava que era instabilidade
# e ficava tentando de novo. A função exige a sessão do Supabase, que a ponte JS já manda,
# então o testador logado tem IA funcionando sem configurar nada.
# O domínio é o da produção VIVA (projeto do time "ia" na Vercel). catedra-plataforma.vercel.app é de um
# projeto antigo que ainda publica a main mas não se controla daqui (chaves e ajustes podem divergir).
AI_ENDPOINT="${CATEDRA_AI_ENDPOINT:-https://catedra-plataforma-fawn.vercel.app/api/complete}"
GEMINI_KEY="${CATEDRA_GEMINI_KEY:-}"

# Worktree em ~/Desktop ou ~/Documents: arquivo esvaziado pelo iCloud volta do git antes de
# qualquer leitura, ou o build para aqui com o comando (scripts/verificar-pasta-sincronizada.mjs).
ct_conferir_pasta "$ROOT"

echo "→ 1/5  Gerando bundle web (Catedra.dc.html → mac/build/web)…"
node "$ROOT/scripts/build-macos.mjs"

# Alvo de implantação explícito: sem isso o toolchain grava minos = versão do
# SDK (ex.: 28.0), acima do macOS instalado, e o LaunchServices recusa abrir o
# app (erro -10825). 14.0 é a base mínima porque a aba Vade Mecum (SwiftUI) usa
# Observation (@Observable) e SettingsLink, disponíveis a partir do macOS 14.
TARGET="arm64-apple-macos14.0"

# A SDK vai EXPLÍCITA em todo swiftc. Sem `-sdk`, o compilador resolve sozinho e nesta
# máquina escolheu uma MacOSX26.5.sdk que não existe mais dentro do Xcode (atualizado
# para o 27): "unable to load standard library", com o build morrendo no 3/5. Perguntar
# o caminho por nome (`xcrun --sdk macosx`) é o mesmo remédio já usado para os plugins
# de macro logo abaixo, e não depende do estado das Command Line Tools.
SDK_PATH="$(xcrun --sdk macosx --show-sdk-path 2>/dev/null || true)"
if [ -z "$SDK_PATH" ] || [ ! -d "$SDK_PATH" ]; then
  echo "     erro: não achei a SDK do macOS (xcrun --sdk macosx). Confira o xcode-select." >&2
  exit 1
fi
SDK_FLAGS=(-sdk "$SDK_PATH")

echo "→ 2/5  Desenhando o ícone (.icns)…"
ICONSET="$BUILD/Catedra.iconset"
rm -rf "$ICONSET"; mkdir -p "$ICONSET"
swiftc -O -target "$TARGET" "${SDK_FLAGS[@]}" "$HERE/Sources/icon.swift" -o "$BUILD/makeicon" -framework AppKit
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
# `xcrun --show-sdk-platform-path` SEM `--sdk` usa a SDK "padrão" do sistema, que nesta
# máquina é o link /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk -> MacOSX27.0.sdk —
# e esse alvo não existe (Command Line Tools atualizado pela metade). O comando falha, e
# como o script roda com `set -e` e o erro ia para /dev/null, o build MORRIA EM SILÊNCIO
# logo depois de "3/5 Compilando…", sem uma linha de explicação. Pedir a SDK pelo nome
# resolve e não depende do estado das CLT.
# Duas coisas nesta linha, e a segunda e a que importa.
# (1) `--sdk macosx` e obrigatorio: sem ele o xcrun usa a SDK "padrao" do sistema, que
#     nesta maquina e o link /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk ->
#     MacOSX27.0.sdk, cujo alvo nao existe (Command Line Tools atualizado pela metade).
# (2) A atribuicao HERDA o status da substituicao de comando. Com `set -e`, um xcrun que
#     falhe derrubava o script AQUI — e como o erro ia para /dev/null, a ultima linha na
#     tela era "3/5 Compilando…" e mais nada. Morte silenciosa, que custou varias
#     tentativas para diagnosticar. O `|| true` tira o script da guilhotina e devolve o
#     controle ao `if` de baixo, que ja sabia avisar.
_SDK_PLAT="$(xcrun --sdk macosx --show-sdk-platform-path 2>/dev/null || true)"
if [ -z "$_SDK_PLAT" ]; then
  echo "     aviso: nao consegui localizar a plataforma da SDK (xcrun --sdk macosx falhou)." >&2
  echo "            Confira o xcode-select; sem os plugins de macro o Swift falha em @State." >&2
fi
PLUGIN_DIR="${_SDK_PLAT}/Developer/usr/lib/swift/host/plugins"
PLUGIN_FLAGS=()
if [ -d "$PLUGIN_DIR" ]; then PLUGIN_FLAGS=(-plugin-path "$PLUGIN_DIR")
else echo "     aviso: plugins de macro não encontrados em $PLUGIN_DIR — se o build falhar em @State, confira o xcode-select"; fi
# Binário UNIVERSAL (arm64 + x86_64). Antes saía só arm64: num Mac Intel o app não
# abria de jeito nenhum — nem com o ritual do Gatekeeper — porque simplesmente não
# havia código para aquela arquitetura. Compilamos as duas fatias e juntamos com lipo.
# Se a fatia Intel falhar (SDK sem suporte na máquina), seguimos só com arm64 avisando,
# em vez de derrubar o build inteiro.
compilar_fatia() {
  swiftc -O -target "$1" "${SDK_FLAGS[@]}" "${PLUGIN_FLAGS[@]}" $LEGIS_SOURCES $JURIS_SOURCES "$HERE/Sources/main.swift" -o "$2" \
    -framework Cocoa -framework WebKit -framework UserNotifications -framework SwiftUI \
    -framework Network -framework PDFKit
}

echo "     · fatia arm64 (Apple Silicon)…"
compilar_fatia "arm64-apple-macos14.0" "$BUILD/$EXEC.arm64"

# CATEDRA_SO_ARM64=1: build LOCAL, para instalar no próprio Mac (Apple Silicon). A fatia
# Intel é a metade do tempo de compilação e não serve para nada nesta máquina; pulá-la
# (e ao lipo) corta o build quase pela metade. O padrão continua universal, porque é o
# universal que se distribui — o binário só arm64 NÃO abre em Mac Intel.
if [ "${CATEDRA_SO_ARM64:-}" = "1" ]; then
  cp "$BUILD/$EXEC.arm64" "$BUILD/$EXEC"
  echo "     · fatia x86_64 PULADA (CATEDRA_SO_ARM64=1)"
  echo "     ⚠ binário só arm64 — só Apple Silicon — não distribuir"
elif echo "     · fatia x86_64 (Macs Intel)…" && compilar_fatia "x86_64-apple-macos14.0" "$BUILD/$EXEC.x86_64" 2>"$BUILD/x86.log"; then
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
  copiar_asset "$JURIS_RES/$f" "$APP/Contents/Resources/$f" opcional \
    "a aba CátedraJURIS abre sem acervo (o repo do Vade Mecum não está nesta máquina)"
done
# A Central de Contas (TCU + TCEs) NAO vem do repo do Vade Mecum: e gerada aqui, dos
# mesmos dados que a web usa (scripts/build-contas-nativo.mjs -> corpus-contas.json).
copiar_asset "$ROOT/corpus-contas.json" "$APP/Contents/Resources/corpus-contas.json" exigido "a Central de Contas (TCU + TCEs) abre vazia"
# Mapa de incidência por artigo (LEGIS nativo): mesmo dado do incidencia.js da web, em JSON.
copiar_asset "$ROOT/incidencia.json" "$APP/Contents/Resources/incidencia.json" exigido "o mapa de incidência por artigo do LEGIS fica sem dado"
# Banco de discursivas/peças (scripts/build-discursivas-nativo.mjs -> discursivas.json): alimenta o Simulado.
copiar_asset "$ROOT/discursivas.json" "$APP/Contents/Resources/discursivas.json" exigido "o Simulado de discursivas abre sem banco"
# Material oficial de prova oral (scripts/build-oral.mjs -> oral.json): alimenta "Oral · bancas reais".
copiar_asset "$ROOT/oral.json" "$APP/Contents/Resources/oral.json" exigido "a tela Oral · bancas reais abre sem concurso nenhum"
copiar_asset "$ROOT/incidencia-verbetes.json" "$APP/Contents/Resources/incidencia-verbetes.json" exigido "a incidência de verbetes some do JURIS"
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
# A política (Developer ID com hardened runtime + carimbo; ad-hoc se falhar) e o porquê de
# cada flag moram em scripts/assinar-app.sh, junto com a assinatura numa cópia limpa.
# Antes, com o repositório em ~/Desktop ou ~/Documents (iCloud), o codesign recusava o
# bundle por "detritus", este script dizia "sem internet", o ad-hoc falhava igual, e o
# build saía com exit 0 e o app SEM assinatura. Agora, se nem o ad-hoc assinar, o build
# para com erro — nunca "✓ Pronto" com um app que trocaria o assinado por um sem.
SIGN_ID="${CATEDRA_SIGN_ID:-}"
if [ -z "$SIGN_ID" ]; then
  # `grep` sem casar devolve 1 e, com `set -e`, derrubaria o build inteiro: || true.
  SIGN_ID="$(security find-identity -v -p codesigning 2>/dev/null \
             | grep 'Developer ID Application' | head -1 \
             | sed -E 's/.*"(.*)"/\1/' || true)"
fi
ct_assinar_mac "$APP" "$BUILD" "$SIGN_ID" || exit 1

echo
echo "✓ Pronto:  $APP"
[ "${CATEDRA_SO_ARM64:-}" = "1" ] && echo "  ⚠ só Apple Silicon (CATEDRA_SO_ARM64=1) — não distribuir; para distribuir, rode sem a variável"
if [ -n "$AI_ENDPOINT" ]; then
  echo "  IA: endpoint = $AI_ENDPOINT"
else
  echo "  IA: nenhum endpoint — usando fallback heurístico local."
  echo "      Para ligar a IA real depois (sem rebuild):"
  echo "      defaults write $BUNDLE_ID CatedraAIEndpoint 'https://SEU-DEPLOY.vercel.app/api/complete'"
fi
echo "  Abrir:   open \"$APP\""
if [ "${CT_REMARCADO:-0}" = 1 ]; then
  # Pasta do iCloud: arrastar no Finder (ou cp) leva o FinderInfo da raiz para /Applications,
  # e lá o --strict passa a reprovar. ditto sem atributos instala o bundle como foi conferido.
  echo "  Instalar (feche o app antes; sem os atributos da pasta sincronizada):"
  echo "      rm -rf \"/Applications/$NAME.app\" && ditto --norsrc --noextattr --noacl \"$APP\" \"/Applications/$NAME.app\""
else
  echo "  Instalar: arraste $NAME.app para /Applications"
fi
