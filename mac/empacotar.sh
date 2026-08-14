#!/bin/bash
# mac/empacotar.sh — prepara o Cátedra.app para MANDAR para um testador.
#
# Por que existe: o app é assinado só ad-hoc (sem conta de Apple Developer), então o
# Gatekeeper recusa — "spctl -a" devolve "rejected". Quem baixar vai levar um aviso de
# desenvolvedor não verificado e, sem instrução, desiste ali. Este script gera o .zip
# junto com um COMO-INSTALAR.txt que explica o caminho exato no macOS atual.
#
# Uso:  bash mac/empacotar.sh
# Saída: mac/build/Catedra-<versão>-<arquiteturas>.zip
set -e

HERE="$(cd "$(dirname "$0")" && pwd)"
BUILD="$HERE/build"
APP="$BUILD/Cátedra.app"

[ -d "$APP" ] || { echo "✗ $APP não existe — rode antes: bash mac/build-app.sh"; exit 1; }

VER="$(cd "$HERE/.." && git rev-parse --short HEAD 2>/dev/null || echo local)"
ARCS="$(lipo -archs "$APP/Contents/MacOS/Catedra" 2>/dev/null | tr ' ' '-')"
ZIP="$BUILD/Catedra-$VER-$ARCS.zip"

# O aviso é honesto: se saiu só arm64, quem tem Mac Intel não abre de jeito nenhum.
if ! echo "$ARCS" | grep -q x86_64; then
  echo "⚠  Este build é SÓ Apple Silicon ($ARCS). Testadores com Mac Intel não vão conseguir abrir."
fi

# ---------------------------------------------------------------------------
# NOTARIZAÇÃO — o que faz o app abrir com duplo clique na máquina do testador.
#
# Ordem que IMPORTA (errar aqui entrega um app "quase pronto" que só funciona
# online): assinar → zipar → submeter → GRAMPEAR o .app → RE-ZIPAR.
# O `stapler` não grampeia zip, só o .app; e o zip que foi submetido não contém
# o tíquete. Distribuir aquele zip faz o app depender de consultar a Apple toda
# vez — offline, o testador leva bloqueio.
#
# Só roda com assinatura Developer ID: a Apple recusa notarizar ad-hoc.
# ---------------------------------------------------------------------------
NOTARIZADO=0
if codesign -dvv "$APP" 2>&1 | grep -q "Signature=adhoc"; then
  echo "⚠  App assinado ad-hoc — pulando notarização (a Apple só notariza Developer ID)."
  echo "   Para distribuir sem o ritual do Gatekeeper: crie o certificado"
  echo "   'Developer ID Application' e rode bash mac/build-app.sh de novo."
else
  PERFIL="${CATEDRA_NOTARY_PROFILE:-catedra-notary}"
  echo "→ Notarizando com o perfil '$PERFIL' (a Apple costuma levar de 1 a 15 min)…"
  TMPZIP="$BUILD/.notarizar-$VER.zip"
  rm -f "$TMPZIP"
  (cd "$BUILD" && ditto -c -k --sequesterRsrc --keepParent "Cátedra.app" "$TMPZIP")

  # `set -e` desligado no trecho: quero TRATAR a falha, não morrer nela.
  set +e
  xcrun notarytool submit "$TMPZIP" --keychain-profile "$PERFIL" --wait --timeout 45m \
    > "$BUILD/notary.log" 2>&1
  NT_RC=$?
  set -e
  rm -f "$TMPZIP"
  sed 's/^/     /' "$BUILD/notary.log"

  if [ $NT_RC -eq 0 ] && grep -q "status: Accepted" "$BUILD/notary.log"; then
    xcrun stapler staple "$APP" >/dev/null && NOTARIZADO=1
    if [ "$NOTARIZADO" = "1" ]; then
      echo "   ✓ notarizado e grampeado"
      # O veredito que vale é este: é o que o Mac do testador vai perguntar.
      spctl -a -vvv "$APP" 2>&1 | sed 's/^/     /'
    fi
  else
    # O motivo NUNCA vem no output do submit — vem do log da submissão.
    SID="$(grep -m1 -E '^ *id: ' "$BUILD/notary.log" | awk '{print $2}' || true)"
    echo "   ✗ notarização não concluída."
    if [ -n "$SID" ]; then
      echo "     Motivo detalhado:  xcrun notarytool log $SID --keychain-profile $PERFIL"
    else
      echo "     Sem credencial configurada? Rode (uma vez só):"
      echo "     xcrun notarytool store-credentials \"$PERFIL\" --apple-id <apple-id> --team-id <TEAMID>"
    fi
    echo "     O pacote sai assim mesmo, mas com o ritual do Gatekeeper."
  fi
fi

if [ "$NOTARIZADO" = "1" ]; then
# App notarizado pela Apple: não mandar o testador no ritual do Gatekeeper —
# ele simplesmente não vai acontecer, e a instrução errada só assusta.
cat > "$BUILD/COMO-INSTALAR.txt" <<TXT
CÁTEDRA — como instalar no Mac
==============================

1. Descompacte o arquivo e arraste "Cátedra.app" para a pasta Aplicativos.

2. Dê um duplo clique. Pronto — o app abre normalmente.

   (Este app é assinado e notarizado pela Apple, então não aparece nenhum
   aviso de "desenvolvedor não identificado".)
TXT
else
# Sem notarização: o Gatekeeper VAI recusar, e sem esta instrução quem baixa
# desiste no aviso.
cat > "$BUILD/COMO-INSTALAR.txt" <<TXT
CÁTEDRA — como instalar no Mac
==============================

1. Descompacte o arquivo e arraste "Cátedra.app" para a pasta Aplicativos.

2. Dê um duplo clique. Vai aparecer um aviso dizendo que o app não pôde ser
   verificado. Isso é esperado: este pacote não passou pela notarização da
   Apple. Clique em OK/Cancelar.

3. Abra Ajustes do Sistema > Privacidade e Segurança e role até o fim.
   Vai ter uma linha sobre o "Cátedra" ter sido bloqueado, com o botão
   "Abrir Mesmo Assim". Clique nele e confirme.

   (Em versões mais antigas do macOS o caminho era clicar com o botão direito
   no app e escolher "Abrir". Nas versões atuais isso não funciona mais — tem
   que ser pelos Ajustes do Sistema.)

4. Da segunda vez em diante é só abrir normalmente.
TXT
fi

# Daqui para baixo o texto é igual nos dois casos.
cat >> "$BUILD/COMO-INSTALAR.txt" <<TXT

Requisitos
----------
- macOS 14 (Sonoma) ou mais novo.
- Arquiteturas neste pacote: $ARCS
  (arm64 = Macs com chip Apple; x86_64 = Macs Intel)

Primeira abertura
-----------------
O app vai pedir permissão para enviar notificações — é para os lembretes de
revisão. Pode recusar sem perder nada mais.

Você vai precisar entrar com e-mail e senha. Use a MESMA conta do site, que os
seus dados sincronizam entre os dois.

Achou um problema?
------------------
Dentro do app: Ajustes > Versão e suporte > "Copiar relatório de problema".
Cole o resultado na mensagem — ele já vem com a versão exata do build.

Versão deste pacote: $VER
TXT

rm -f "$ZIP"
# ditto preserva a assinatura ad-hoc e os links simbólicos do bundle; "zip" comum corrompe.
(cd "$BUILD" && ditto -c -k --sequesterRsrc --keepParent "Cátedra.app" "$ZIP")
cp "$BUILD/COMO-INSTALAR.txt" "$BUILD/COMO-INSTALAR-$VER.txt"

echo "✓ Pacote:  $ZIP  ($(du -h "$ZIP" | cut -f1))"
echo "  Junto:   $BUILD/COMO-INSTALAR-$VER.txt  — mande os dois."
echo "  Arqs:    $ARCS"
