#!/bin/sh
# ci_post_clone.sh — roda no Xcode Cloud logo depois do clone, antes do xcodebuild.
#
# O projeto ios/Catedra.xcodeproj empacota a pasta `web` (../mac/build/web): é o bundle web
# GERADO por scripts/build-macos.mjs, que não é versionado. O Xcode Cloud não gera nada
# sozinho, e sem este script o build morria em "The file “web” couldn’t be opened because
# there is no such file." — em todos os 108 builds desde 17/08/2026.
#
# A Apple só acha este arquivo porque ele mora em ios/ci_scripts/, na MESMA pasta do
# .xcodeproj (não na raiz do repositório), e só o executa direito com o bit de execução
# (chmod +x); sem ele, roda com zsh.
#
# A única rede aqui é a do Homebrew, e só se o Node faltar na imagem. React, ReactDOM e
# supabase-js NÃO são baixados: vêm de vendor/ (versionados no repositório, versões congeladas)
# e o build-macos.mjs confere o sha256 de cada um contra vendor/manifesto.json — o app do
# TestFlight leva os mesmos bytes da web publicada. O app continua sem rede em tempo de
# execução. Qualquer falha sai com código ≠ 0 e derruba o build com o motivo, em vez de deixar
# o xcodebuild tropeçar na pasta que falta.
set -eu

RAIZ="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"

if ! command -v node >/dev/null 2>&1; then
  echo "→ Node não está na imagem do Xcode Cloud; instalando pelo Homebrew…"
  export HOMEBREW_NO_INSTALL_CLEANUP=1 HOMEBREW_NO_ENV_HINTS=1
  brew install node
fi
echo "→ node $(node --version)"

# As bibliotecas congeladas têm de ter vindo no clone (o build-macos.mjs também confere o
# hash de cada uma; aqui é só para o motivo aparecer logo, e não no meio do gerador).
cd "$RAIZ"
if [ ! -f vendor/manifesto.json ]; then
  echo "✗ vendor/manifesto.json não veio no clone: as bibliotecas (React, supabase-js) são versionadas lá"
  exit 1
fi

# Mesmo passo e mesmo alvo do ios/build-ipad.sh.
echo "→ Gerando o bundle web (Catedra.dc.html → mac/build/web), bibliotecas de vendor/…"
CATEDRA_ALVO=iPadOS node scripts/build-macos.mjs

if [ ! -f mac/build/web/index.html ]; then
  echo "✗ build-macos.mjs terminou sem mac/build/web/index.html"
  exit 1
fi
echo "✓ bundle web pronto: $(du -sh mac/build/web | cut -f1)"
