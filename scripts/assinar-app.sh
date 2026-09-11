#!/usr/bin/env bash
# assinar-app.sh — assinatura de bundle numa cópia limpa, comum ao Mac e ao iPad.
#
#   source "$ROOT/scripts/assinar-app.sh"
#   ct_assinar_limpo "$APP" "$BUILD/codesign.log" --force --sign "$ID" …   # qualquer alvo
#   ct_assinar_mac   "$APP" "$BUILD" "$SIGN_ID" || exit 1                  # política do Mac
#
# POR QUE EXISTE (11/09/2026): com o repositório em ~/Desktop ou ~/Documents, que o iCloud
# ("Mesa e Documentos") sincroniza, o File Provider grava com.apple.FinderInfo (e
# com.apple.fileprovider.fpfs#P) no bundle, e o codesign recusa: "resource fork, Finder
# information, or similar detritus not allowed". O script do Mac culpava a internet, caía
# para ad-hoc, o ad-hoc falhava pelo mesmo motivo, e ele saía com exit 0 entregando um app
# SEM assinatura — que, copiado para /Applications, trocava um app assinado por um sem.
#
# O que se mediu na pasta sincronizada, e que decide o desenho:
#   · `xattr -cr` e assinar no lugar NÃO resolve: o File Provider marca a RAIZ do .app com
#     FinderInfo (flag kHasBundle) e regrava o atributo logo depois de apagado. Às vezes o
#     codesign até assina (rc 0) e o `--verify --strict` seguinte já reprova.
#   · Nem o atributo com.apple.fileprovider.ignore#P na pasta de build impede a marcação.
#   · Os atributos estendidos não entram no selo: apagá-los não invalida a assinatura, e
#     `codesign --verify` sem --strict aceita o bundle marcado.
# Por isso a assinatura acontece numa cópia fora da pasta sincronizada (ditto sem atributos,
# em /private/tmp), o `--verify --strict` roda LÁ, e só então o bundle assinado volta. No
# destino, se a pasta remarcar a raiz, a conferência estrita é refeita numa cópia sem os
# atributos — o mesmo que chega a /Applications quando se instala com ditto --noextattr.
#
# Sem `trap` aqui, de propósito: o `trap … EXIT` da guarda (scripts/guarda-build.sh) é o
# que apaga a trava de build cruzado, e um trap novo o substituiria. A pasta temporária é
# apagada à mão em cada saída.
#
# CATEDRA_ASSINAR_TMP muda a pasta-base das cópias (padrão /private/tmp); o teste usa isso
# para conferir que nada fica para trás.

# Pasta temporária FORA de qualquer pasta sincronizada.
_ct_tmp_assinatura() {
  mktemp -d "${CATEDRA_ASSINAR_TMP:-/private/tmp}/catedra-assinar.XXXXXX"
}

# ct_assinar_limpo <app> <log> <argumentos do codesign…>
# Copia o bundle sem atributos para fora, assina, verifica com --strict e traz de volta.
# 0 = o app no lugar de origem está assinado e íntegro. Diferente de 0 = falhou; o motivo
# fica no <log> (leia com ct_motivo_codesign) e o app de origem fica como estava.
# CT_REMARCADO (global de propósito) vira 1 quando a pasta remarcou o bundle na volta: quem
# chama decide como orientar a instalação — no Mac, ditto sem atributos; o iPad instala
# pelo devicectl e não precisa disso. Por isso o comando de instalar NÃO sai daqui.
ct_assinar_limpo() {
  local app="${1%/}" log="$2"; shift 2
  local nome tmp copia
  CT_REMARCADO=0
  nome="$(basename "$app")"
  : > "$log"
  if [ ! -d "$app" ]; then echo "$app: o bundle não existe" > "$log"; return 1; fi
  if ! tmp="$(_ct_tmp_assinatura)"; then echo "não consegui criar a pasta temporária" > "$log"; return 1; fi
  copia="$tmp/$nome"

  if ! ditto --norsrc --noextattr --noacl "$app" "$copia" 2>>"$log"; then
    rm -rf "$tmp"; return 1
  fi
  # ditto --noextattr já descarta os atributos; o -cr pega o que o sistema grava na criação.
  xattr -cr "$copia" 2>/dev/null || true

  if ! codesign "$@" "$copia" 2>>"$log"; then rm -rf "$tmp"; return 1; fi
  if ! codesign --verify --strict "$copia" 2>>"$log"; then rm -rf "$tmp"; return 1; fi

  # Assinado e íntegro fora: agora substitui o de origem. ditto sobre bundle existente
  # MISTURA as pastas (arquivo velho sobraria e quebraria o selo), por isso o rm antes.
  rm -rf "$app"
  if ! ditto --norsrc --noextattr --noacl "$copia" "$app" 2>>"$log"; then
    echo "a cópia de volta falhou; o app assinado ficou em $copia" >> "$log"
    return 1
  fi

  if ! codesign --verify --strict "$app" 2>/dev/null; then
    # Pasta sincronizada: o File Provider remarcou a raiz. A assinatura precisa continuar
    # íntegra (sem --strict) e a cópia sem atributos precisa passar no --strict.
    rm -rf "$copia"
    if ! codesign --verify "$app" 2>>"$log" \
       || ! ditto --norsrc --noextattr --noacl "$app" "$copia" 2>>"$log" \
       || ! codesign --verify --strict "$copia" 2>>"$log"; then
      rm -rf "$tmp"; return 1
    fi
    CT_REMARCADO=1
    echo "     ⚠ a pasta é sincronizada (iCloud): o File Provider remarcou o bundle com FinderInfo."
    echo "       A assinatura está íntegra (--strict conferido numa cópia sem os atributos)."
  fi
  rm -rf "$tmp"
  return 0
}

# ct_motivo_codesign <log>
# A primeira linha real do log (sem o "replacing existing signature", que não é erro) e,
# só quando o log fala nisso, a dica que serve. Rede é sugerida SÓ se o log citar o carimbo
# de tempo — antes o script dizia "sem internet" para qualquer falha, e o motivo real (a
# pasta do iCloud) ficou escondido.
ct_motivo_codesign() {
  local log="$1" linha
  linha="$(grep -v -e 'replacing existing signature' -e '^[[:space:]]*$' "$log" 2>/dev/null | head -1 || true)"
  if [ -z "$linha" ]; then
    echo "       motivo: o codesign não deixou mensagem ($log)"
    return 0
  fi
  echo "       motivo: $linha"
  if grep -qi 'timestamp' "$log" 2>/dev/null; then
    echo "       O --timestamp precisa alcançar timestamp.apple.com: confira a rede e rode de novo."
  elif grep -qi 'detritus' "$log" 2>/dev/null; then
    echo "       Atributo estendido no bundle (FinderInfo, resource fork) — típico de pasta sincronizada pelo iCloud."
  fi
  echo "       (log completo: $log)"
}

# ct_assinar_mac <app> <pasta dos logs> <identidade Developer ID ou vazio>
# Política do Mac: Developer ID com hardened runtime e carimbo de tempo; se falhar, ad-hoc.
# 0 = o app saiu assinado (um dos dois). 1 = NEM o ad-hoc assinou — quem chama sai com erro,
# para nunca entregar um app sem assinatura com cara de pronto.
#
# DUAS assinaturas possíveis, e a diferença decide se o testador consegue abrir:
#   · "Developer ID Application" (conta paga da Apple) + notarização → o app abre com duplo
#     clique na máquina de qualquer um, sem ritual nenhum.
#   · ad-hoc → o Gatekeeper recusa, e quem recebe precisa do "Abrir Mesmo Assim".
#
# ARMADILHA que custou caro descobrir: NÃO basta trocar o `-s -` pelo Developer ID. Sem
# `--options runtime` (hardened runtime) e sem `--timestamp`, a notarização REPROVA — e nada
# avisa nesta máquina, porque o app abre normalmente aqui. O erro só aparece quando o
# testador tenta abrir. Por isso as duas flags são obrigatórias e conferidas abaixo.
#
# `--deep` saiu: está DEPRECADO para assinar desde o macOS 13 (man codesign) e aplica as
# mesmas opções a todo conteúdo aninhado — quase nunca o que se quer. O bundle é plano
# (nenhum .appex/.framework/.dylib/.xpc dentro), então uma assinatura no .app basta. No dia
# em que o widget entrar, a ordem inverte: assina o .appex ANTES do .app.
#
# `--entitlements` também não: o app NÃO é sandboxed e não precisa de nenhum entitlement.
# Em especial NÃO usar `disable-library-validation` — a doc da Apple avisa que o Gatekeeper
# roda checagens extras em quem o desliga e pode BLOQUEAR o app. E o WKWebView não exige
# `allow-jit`: o JavaScript roda no processo com.apple.WebKit.WebContent da própria Apple,
# que já tem esse entitlement. (mac/Catedra.entitlements pede app-groups, resquício do
# widget que nem é montado; passá-lo aqui seria peso morto.)
ct_assinar_mac() {
  local app="$1" logs="$2" id="$3" cs
  if [ -n "$id" ]; then
    echo "     identidade: $id"
    if ct_assinar_limpo "$app" "$logs/codesign.log" --force --options runtime --timestamp --sign "$id"; then
      cs="$(codesign -dvv "$app" 2>&1)"
      case "$cs" in *runtime*) echo "     ✓ hardened runtime";; *) echo "     ⚠ SEM hardened runtime — a notarização vai reprovar";; esac
      case "$cs" in *Timestamp=*) echo "     ✓ carimbo de tempo";; *) echo "     ⚠ SEM carimbo de tempo — a notarização vai reprovar";; esac
      echo "     ✓ assinado para DISTRIBUIÇÃO (--verify --strict conferido)"
      return 0
    fi
    echo "     ⚠ falhou assinar com Developer ID."
    ct_motivo_codesign "$logs/codesign.log"
    echo "       Caindo para ad-hoc: o app sai só para uso nesta máquina."
  else
    echo "     ⚠ sem certificado 'Developer ID Application' no chaveiro."
  fi

  if ct_assinar_limpo "$app" "$logs/codesign-adhoc.log" --force --sign -; then
    echo "     assinado (ad-hoc — serve para usar aqui, não para distribuir; --verify --strict conferido)"
    echo "       O testador vai precisar do ritual \"Abrir Mesmo Assim\"."
    return 0
  fi
  echo "     ✗ nem a assinatura ad-hoc passou — o app NÃO está assinado."
  ct_motivo_codesign "$logs/codesign-adhoc.log"
  echo "       Não copie este app para /Applications: ele trocaria um app assinado por um sem assinatura."
  return 1
}
