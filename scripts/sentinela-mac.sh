#!/bin/bash
# scripts/sentinela-mac.sh — a parte STF + STJ do sentinela, rodada no Mac da dona.
#
# POR QUE EXISTE (03/10/2026): no GitHub Actions o STF e o STJ respondem HTTP 403 a TUDO
# (Informativo, repercussão geral, repetitivos, súmulas), inclusive às edições que já estão no
# acervo. Do Mac, as MESMAS requisições, com o mesmo motor e a verificação TLS ligada, respondem
# 200 com conteúdo real. É bloqueio por endereço de nuvem. Não se contorna o bloqueio (nada de
# proxy nem rotação de IP): a leitura sai da rede da própria dona, em volume baixo, uma vez por
# dia. O GitHub Actions fica só com o Planalto (padrão `planalto` em .github/workflows/sentinela.yml).
#
# Como encaixa no PR único `sentinela/atualizacoes`:
#   · o workflow refaz o branch a partir da main a cada rodada, mas traz do PR aberto o
#     novidades.js, o sentinela/estado.json e o sentinela/retratos.json; o motor preserva o
#     estado e os itens das fontes que não consultou. Então o que este script grava para STF/STJ
#     sobrevive à rodada do Planalto, e vice-versa;
#   · aqui se faz o mesmo: parte do PR aberto (ou da main), consulta só STF+STJ e, se algo mudou,
#     faz UM commit sobre a ponta do PR com os três arquivos e envia SEM forçar. Se o branch andou
#     no meio, o push recusa e a rodada de amanhã refaz: nunca se sobrescreve nada.
#   · sem PR aberto, só abre um novo (em rascunho) quando houver novidade de verdade.
#
# Se o Mac não rodar (desligado, sem rede), o estado do STF/STJ envelhece à vista na Central
# ("última tentativa" antiga); nunca vira "sem novidade".
#
# Uso: bash scripts/sentinela-mac.sh <pasta de um worktree DEDICADO do catedra-plataforma>
# O LaunchAgent (scripts/launchd/com.catedra.sentinela-stf-stj.plist) chama isto às 06:40.
set -euo pipefail
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

WT="${1:?informe a pasta do worktree dedicado}"
BRANCH="sentinela/atualizacoes"
REPO="lanabiatriz2001-ai/catedra-plataforma"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/sentinela-mac.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
echo "== $(date '+%Y-%m-%d %H:%M:%S') sentinela STF+STJ no Mac ($WT)"

cd "$WT"
# O worktree é só desta tarefa: qualquer resto de rodada anterior sai antes (arquivos rastreados).
git reset -q --hard
git fetch -q origin main
git checkout -q --detach origin/main

cp juris-index.js "$TMP/juris-index-antes.js"
ref=""; extra=()
aberto=$(gh pr list --repo "$REPO" --head "$BRANCH" --state open --json number -q '.[0].number // empty')
if [ -n "$aberto" ]; then
  git fetch -q origin "$BRANCH"
  ref=$(git rev-parse FETCH_HEAD)
  git checkout -q "$ref" -- novidades.js sentinela/estado.json
  if git cat-file -e "$ref:sentinela/retratos.json" 2>/dev/null; then git checkout -q "$ref" -- sentinela/retratos.json; fi
  echo "   partindo do PR aberto #$aberto (${ref:0:7})"
else
  recusado=$(gh pr list --repo "$REPO" --head "$BRANCH" --state closed --json number,mergedAt -q '[.[0] | select(. != null and .mergedAt == null) | .number][0] // empty')
  if [ -n "$recusado" ]; then
    git fetch -q origin "pull/$recusado/head"
    if git show "FETCH_HEAD:novidades.js" > "$TMP/novidades-recusado.js" 2>/dev/null; then extra=(--ja-propostos "$TMP/novidades-recusado.js"); fi
  fi
  echo "   sem PR aberto: partindo da main"
fi

node scripts/sentinela.mjs --fonte stf,stj --detectar-desde "$TMP/juris-index-antes.js" "${extra[@]+"${extra[@]}"}" | tee "$TMP/log.txt"
node scripts/verificar-segredos.mjs >/dev/null

ARQS=(novidades.js sentinela/estado.json)
[ -f sentinela/retratos.json ] && ARQS+=(sentinela/retratos.json)
for f in "${ARQS[@]}"; do cp "$f" "$TMP/$(basename "$f")"; done
novos=$(grep -oE '[0-9]+ nova\(s\)' "$TMP/log.txt" | grep -oE '^[0-9]+' | tail -1 || true)
msg="O sentinela leu o STF e o STJ a partir do Mac (no GitHub Actions eles respondem 403)"

if [ -n "$ref" ]; then
  git reset -q --hard
  git checkout -q --detach "$ref"
  for f in "${ARQS[@]}"; do cp "$TMP/$(basename "$f")" "$f"; done
  if git diff --quiet -- "${ARQS[@]}"; then echo "   nada mudou no PR #$aberto"; exit 0; fi
  git add -- "${ARQS[@]}"
  git commit -q -m "$msg"
  git push -q origin "HEAD:refs/heads/$BRANCH" && echo "   enviado ao PR #$aberto (${novos:-0} nova(s))" \
    || { echo "   o branch andou no meio da rodada: nada enviado; a rodada de amanhã refaz"; exit 0; }
elif [ "${novos:-0}" -gt 0 ]; then
  git reset -q --hard
  git checkout -q -B "$BRANCH" origin/main
  for f in "${ARQS[@]}"; do cp "$TMP/$(basename "$f")" "$f"; done
  git add -- "${ARQS[@]}"
  git commit -q -m "$msg"
  git push -q origin "HEAD:refs/heads/$BRANCH"
  gh pr create --repo "$REPO" --head "$BRANCH" --base main --draft --title 'Atualizações das fontes oficiais' \
    --body "Varredura do STF e do STJ feita no Mac (no GitHub Actions eles respondem 403). Atualização assistida: o sentinela detecta e propõe; item marcado para revisão só entra no acervo depois de conferido na fonte oficial. A rodada diária do Planalto, no GitHub, atualiza este mesmo PR."
  git checkout -q --detach origin/main
else
  echo "   sem PR aberto e sem novidade: nada a publicar"
fi
