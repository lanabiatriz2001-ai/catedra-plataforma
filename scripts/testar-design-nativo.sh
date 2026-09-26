#!/bin/bash
# Compila a base visual nativa (ios/vendor/design) junto com tests/design-nativo/main.swift
# e roda no Mac. É o único lugar em que a base compila SOZINHA — se ela depender de algo do
# LEGIS ou do JURIS, este script quebra, e isso é o que se quer: a base não depende de tela.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mktemp -d)/testes-design-nativo"
SDK="$(xcrun --sdk macosx --show-sdk-path)"
xcrun --sdk macosx swiftc -sdk "$SDK" "$ROOT"/ios/vendor/design/*.swift \
  "$ROOT/tests/design-nativo/main.swift" -o "$OUT"
"$OUT" "$ROOT/fonts"
