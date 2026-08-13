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

cat > "$BUILD/COMO-INSTALAR.txt" <<TXT
CÁTEDRA — como instalar no Mac
==============================

1. Descompacte o arquivo e arraste "Cátedra.app" para a pasta Aplicativos.

2. Dê um duplo clique. Vai aparecer um aviso dizendo que o app não pôde ser
   verificado. Isso é esperado: o app não passou pela notarização da Apple
   (que exige uma conta paga de desenvolvedor). Clique em OK/Cancelar.

3. Abra Ajustes do Sistema > Privacidade e Segurança e role até o fim.
   Vai ter uma linha sobre o "Cátedra" ter sido bloqueado, com o botão
   "Abrir Mesmo Assim". Clique nele e confirme.

   (Em versões mais antigas do macOS o caminho era clicar com o botão direito
   no app e escolher "Abrir". Nas versões atuais isso não funciona mais — tem
   que ser pelos Ajustes do Sistema.)

4. Da segunda vez em diante é só abrir normalmente.

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
