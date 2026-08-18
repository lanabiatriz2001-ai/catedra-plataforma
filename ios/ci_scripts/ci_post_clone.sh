#!/bin/sh
# ci_post_clone.sh — o Xcode Cloud executa este script logo depois de clonar o repo,
# antes de qualquer build.
#
# Por que ele existe: o app embarca o bundle web em mac/build/web, que é GERADO
# (scripts/build-macos.mjs lê o Catedra.dc.html) e está no .gitignore. Num clone
# limpo esse diretório não existe, e sem ele a fase de recursos do Xcode falha com
# "The file 'web' couldn't be opened because there is no such file".
#
# O runner do Xcode Cloud não traz Node por padrão, então instalamos aqui.
set -e

cd "${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/.." && pwd)}"

if ! command -v node >/dev/null 2>&1; then
  echo "→ node ausente no runner; instalando via Homebrew…"
  brew install node
fi

echo "→ gerando mac/build/web a partir do Catedra.dc.html…"
node scripts/build-macos.mjs

if [ ! -d mac/build/web ]; then
  echo "error: mac/build/web não foi gerado — o app subiria sem conteúdo." >&2
  exit 1
fi

echo "→ ok: $(du -sh mac/build/web | cut -f1) de bundle web pronto."
