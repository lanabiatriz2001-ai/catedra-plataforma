#!/bin/bash
# Compila o estado persistido do JURIS nativo (mac/vendor/juris/Store/JurisEstadoPersistido.swift)
# com Colecao.swift e Markup.swift reais e tests/estado-juris/main.swift (que traz os dublês dos
# modelos que puxariam o app inteiro), e roda no Mac.
# A cópia do iPad é idêntica (tests/sem-mapas-mentais.mjs confere byte a byte).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mktemp -d)/testes-estado-juris"
SDK="$(xcrun --sdk macosx --show-sdk-path)"
J="$ROOT/mac/vendor/juris"
xcrun --sdk macosx swiftc -sdk "$SDK" \
  "$J/Store/JurisEstadoPersistido.swift" "$J/Store/Colecao.swift" "$J/Store/Markup.swift" \
  "$ROOT/tests/estado-juris/main.swift" -o "$OUT"
"$OUT"
