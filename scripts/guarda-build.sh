#!/usr/bin/env bash
# guarda-build.sh — trava de build cruzado, comum ao Mac e ao iPad.
#
#   source "$ROOT/scripts/guarda-build.sh"; ct_travar_build macos "$ROOT" build-app.sh
#
# POR QUE EXISTE: dois builds do MESMO alvo rodando ao mesmo tempo neste repositório
# se atropelam — os dois escrevem em mac/build (ou ios/build) e no bundle web gerado por
# scripts/build-macos.mjs. O resultado já observado foi um .app sem a fatia Intel e um
# .ipa montado no meio de dois processos. Paralelizar Mac × iPad continua permitido (são
# pastas e alvos diferentes); o que a trava recusa é o segundo build do mesmo alvo.
#
# Saída de emergência: CATEDRA_IGNORAR_TRAVA=1 (para quando a trava mentir).

ct_travar_build() {
  local alvo="$1" raiz="$2" padrao="${3:-$(basename "${0:-build}")}"
  local lock="$raiz/.build-lock-$alvo"

  if [ "${CATEDRA_IGNORAR_TRAVA:-}" = "1" ]; then
    echo "⚠  CATEDRA_IGNORAR_TRAVA=1 — trava de build cruzado desligada a pedido."
    return 0
  fi

  # mkdir é atômico nos dois sistemas de arquivo que importam aqui (APFS e o do CI);
  # `flock` não existe no macOS, então é ele quem faz o papel de seção crítica.
  if ! mkdir "$lock" 2>/dev/null; then
    local dono; dono="$(cat "$lock/pid" 2>/dev/null || echo '')"
    # Trava órfã (a máquina caiu, alguém deu ⌃C no meio): o dono não existe mais.
    if [ -n "$dono" ] && kill -0 "$dono" 2>/dev/null; then
      echo "✗ BUILD RECUSADO: já existe um build de $alvo rodando (PID $dono)." >&2
      echo "  Espere terminar, ou mate-o com:  kill $dono" >&2
      echo "  Se tiver certeza de que a trava está mentindo:  CATEDRA_IGNORAR_TRAVA=1 $0" >&2
      exit 3
    fi
    echo "⚠  Trava órfã de $alvo (PID ${dono:-desconhecido} não existe mais) — assumindo."
    rm -rf "$lock"; mkdir "$lock" 2>/dev/null || { echo "✗ não consegui criar $lock" >&2; exit 3; }
  fi

  echo "$$" > "$lock/pid"
  # A trava morre com o processo, inclusive em erro e em ⌃C — senão o próximo build
  # legítimo esbarraria numa trava órfã e a pessoa aprenderia a ignorá-la. Em ⌃C o
  # handler também ENCERRA: só apagar a trava e seguir deixaria o build morrendo aos
  # poucos sem dono registrado.
  # shellcheck disable=SC2064
  trap "rm -rf '$lock'" EXIT
  # shellcheck disable=SC2064
  trap "rm -rf '$lock'; exit 130" INT
  # shellcheck disable=SC2064
  trap "rm -rf '$lock'; exit 143" TERM

  # Rede de segurança para o build que começou ANTES desta trava existir (ou que rodou
  # com CATEDRA_IGNORAR_TRAVA): sem arquivo de trava, só o processo denuncia.
  local vizinhos
  vizinhos="$(pgrep -f "$padrao" 2>/dev/null | grep -vx "$$" || true)"
  vizinhos="$(echo "$vizinhos" | grep -v '^$' || true)"
  if [ -n "$vizinhos" ]; then
    echo "✗ BUILD RECUSADO: outro processo de build de $alvo está vivo: $(echo "$vizinhos" | tr '\n' ' ')" >&2
    echo "  Mate-o (kill $(echo "$vizinhos" | tr '\n' ' ')) ou use CATEDRA_IGNORAR_TRAVA=1." >&2
    rm -rf "$lock"
    exit 3
  fi
}
