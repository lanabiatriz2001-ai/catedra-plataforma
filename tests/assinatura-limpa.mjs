/* ASSINATURA NUMA CÓPIA LIMPA (11/09/2026)

   Com o repositório em ~/Desktop ou ~/Documents (iCloud "Mesa e Documentos"), o File
   Provider grava com.apple.FinderInfo no bundle e o codesign recusa: "resource fork, Finder
   information, or similar detritus not allowed". O build do Mac culpava a internet, caía
   para ad-hoc, o ad-hoc falhava igual, e saía com exit 0 e o app SEM assinatura; o do iPad
   parava na etapa 4. scripts/assinar-app.sh assina numa cópia fora da pasta, confere com
   --verify --strict lá e só então devolve o bundle.

   O que se prova, com um bundle de mentira marcado por xattr -w do jeito que a pasta do
   iCloud marca (FinderInfo na raiz com o flag kHasBundle, FinderInfo e fpfs#P num recurso):
   · controle: assinar no lugar REPROVA com "detritus" — sem isso o resto passaria à toa;
   · ct_assinar_limpo limpa e assina (ad-hoc: nenhum certificado é preciso), o app passa no
     --verify --strict, volta no mesmo caminho com o conteúdo intacto e sem FinderInfo;
   · quando a pasta remarca o bundle na volta (um `ditto` de mentira no PATH faz o que o File
     Provider faz), a assinatura é conferida numa cópia sem os atributos e o script ensina a
     instalar sem eles; se o conteúdo que voltou estiver estragado, a conferência reprova;
   · ct_assinar_mac com uma identidade que não existe cai para ad-hoc e mostra a linha real
     do log ("no identity found"), sem culpar a internet;
   · ct_motivo_codesign só fala em rede quando o log fala em timestamp;
   · um bundle que nem o ad-hoc assina devolve erro, e o app de origem não some;
   · nenhuma cópia temporária fica para trás, nem nas falhas;
   · os dois scripts de build usam o módulo, e os dois saem com erro quando ele falha.

   Só roda no macOS (codesign, ditto e xattr são de lá); fora dele, é pulado com aviso.
   Roda sozinho, sem navegador: node tests/assinatura-limpa.mjs */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULO = path.join(RAIZ, 'scripts', 'assinar-app.sh');
// FinderInfo tem 32 bytes, e zerado o sistema o descarta. Na raiz vai o valor que o File
// Provider grava num .app da pasta do iCloud (flag kHasBundle, 0x2000); no arquivo, tipo e
// criador de um texto qualquer (TEXT/ttxt).
const FINDERINFO_RAIZ = '0'.repeat(16) + '2000' + '0'.repeat(44);
const FINDERINFO_ARQ = '5445585474747874' + '0'.repeat(48);
const HTML = '<!doctype html><title>Cátedra</title>';

export async function testarAssinaturaLimpa(ok) {
  const R = 'ASSINATURA ';
  if (process.platform !== 'darwin') {
    console.log('· ' + R + 'pulada fora do macOS — codesign, ditto e xattr só existem lá');
    return;
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-assinatura-'));
  // As cópias do módulo nascem aqui (CATEDRA_ASSINAR_TMP), para dar para conferir que somem.
  const tmpBase = path.join(dir, 'tmp');
  fs.mkdirSync(tmpBase);
  const rodar = (bin, args, env) => {
    const r = spawnSync(bin, args, { encoding: 'utf8', env: { ...process.env, ...(env || {}) } });
    return { code: r.status, saida: (r.stdout || '') + (r.stderr || '') };
  };
  // Mesmo modo dos scripts de build: set -euo pipefail e o módulo carregado por source.
  const sh = (linha, env) => rodar('bash', ['-c', 'set -euo pipefail\nsource "$MODULO"\n' + linha],
    { MODULO, CATEDRA_ASSINAR_TMP: tmpBase, ...env });
  const plist = (nome) => '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n'
    + '<plist version="1.0"><dict>'
    + '<key>CFBundleExecutable</key><string>' + nome + '</string>'
    + '<key>CFBundleIdentifier</key><string>com.catedra.teste.' + nome.toLowerCase() + '</string>'
    + '<key>CFBundlePackageType</key><string>APPL</string>'
    + '</dict></plist>\n';
  const indexDe = (app) => path.join(app, 'Contents', 'Resources', 'web', 'index.html');
  const montar = (nome, { executavelPasta } = {}) => {
    const app = path.join(dir, nome + '.app');
    fs.mkdirSync(path.join(app, 'Contents', 'MacOS'), { recursive: true });
    fs.mkdirSync(path.dirname(indexDe(app)), { recursive: true });
    // Executável principal que é pasta: o codesign recusa em qualquer modo ("Is a directory").
    // Faltar o executável NÃO serve — o ad-hoc assina o bundle mesmo assim.
    const exe = path.join(app, 'Contents', 'MacOS', nome);
    if (executavelPasta) fs.mkdirSync(exe); else fs.copyFileSync('/usr/bin/true', exe);
    fs.writeFileSync(path.join(app, 'Contents', 'Info.plist'), plist(nome));
    fs.writeFileSync(indexDe(app), HTML);
    return app;
  };
  const marcar = (app) => {
    rodar('xattr', ['-wx', 'com.apple.FinderInfo', FINDERINFO_RAIZ, app]);
    rodar('xattr', ['-wx', 'com.apple.FinderInfo', FINDERINFO_ARQ, indexDe(app)]);
    rodar('xattr', ['-w', 'com.apple.fileprovider.fpfs#P', '1', indexDe(app)]);
  };
  const temFinderInfo = (app) => /com\.apple\.FinderInfo/.test(rodar('xattr', ['-lr', app]).saida);
  const estrito = (app) => rodar('codesign', ['--verify', '--strict', app]).code === 0;
  const adhoc = (app) => /Signature=adhoc/.test(rodar('codesign', ['-dv', app]).saida);

  try {
    // 1) controle: o bundle marcado reproduz o defeito quando assinado no lugar
    const controle = montar('Controle');
    marcar(controle);
    ok(temFinderInfo(controle), R + 'o bundle de mentira sai marcado com com.apple.FinderInfo (xattr -w)');
    const noLugar = rodar('codesign', ['--force', '--sign', '-', controle]);
    ok(noLugar.code !== 0 && /detritus/.test(noLugar.saida),
      R + 'controle: assinar no lugar reprova com "detritus" (o defeito se reproduz)');

    // 2) o passo de assinatura limpa, assina e confere
    const app = montar('Sonda');
    marcar(app);
    const log = path.join(dir, 'codesign.log');
    const limpo = sh('ct_assinar_limpo "$APP" "$LOG" --force --sign -\necho "REMARCADO=$CT_REMARCADO"', { APP: app, LOG: log });
    ok(limpo.code === 0, R + 'ct_assinar_limpo assina o bundle marcado, sem certificado (exit ' + limpo.code
      + (limpo.code ? ': ' + fs.readFileSync(log, 'utf8').trim().split('\n')[0] : '') + ')');
    ok(/REMARCADO=0/.test(limpo.saida) && !/sincronizada/.test(limpo.saida),
      R + 'fora da pasta sincronizada não há aviso de remarcação (CT_REMARCADO=0)');
    ok(estrito(app), R + 'o app devolvido passa no codesign --verify --strict');
    ok(adhoc(app), R + 'a assinatura é a pedida (ad-hoc)');
    ok(!temFinderInfo(app), R + 'o app devolvido não carrega FinderInfo');
    ok(fs.existsSync(indexDe(app)) && fs.readFileSync(indexDe(app), 'utf8') === HTML,
      R + 'o bundle volta no mesmo caminho, com o conteúdo intacto');

    // 3) a pasta do iCloud remarca a raiz do .app cerca de 1 s depois que ele volta (medido
    //    à mão em 11/09/2026; nem xattr -cr nem com.apple.fileprovider.ignore#P impedem).
    //    Um `ditto` de mentira no PATH faz o mesmo: copia e marca o destino da volta.
    const bin = path.join(dir, 'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, 'ditto'), [
      '#!/bin/bash',
      '/usr/bin/ditto "$@" || exit $?',
      'destino="${@: -1}"',
      '[ "$destino" = "$REMARCAR" ] || exit 0',
      'xattr -wx com.apple.FinderInfo ' + FINDERINFO_RAIZ + ' "$destino"',
      '[ -n "${ESTRAGAR:-}" ] && echo estragado >> "$destino/Contents/Resources/web/index.html"',
      'exit 0'].join('\n'), { mode: 0o755 });
    const comPasta = { PATH: bin + ':' + process.env.PATH, REMARCAR: app };
    marcar(app);
    const remarcado = sh('ct_assinar_limpo "$APP" "$LOG" --force --sign -\necho "REMARCADO=$CT_REMARCADO"', { APP: app, LOG: log, ...comPasta });
    ok(remarcado.code === 0, R + 'pasta que remarca o bundle na volta: a assinatura é aceita (exit ' + remarcado.code + ')');
    ok(temFinderInfo(app) && !estrito(app) && rodar('codesign', ['--verify', app]).code === 0,
      R + 'no destino remarcado o selo segue íntegro (o --strict reprova só pelo atributo da pasta)');
    // O iPad também passa por aqui: o aviso comum não pode mandar instalar em /Applications.
    ok(/sincronizada/.test(remarcado.saida) && /REMARCADO=1/.test(remarcado.saida) && !/\/Applications/.test(remarcado.saida),
      R + 'o aviso diz que a pasta é sincronizada e sinaliza CT_REMARCADO=1, sem falar em /Applications');
    marcar(app);
    const estragado = sh('ct_assinar_limpo "$APP" "$LOG" --force --sign -', { APP: app, LOG: log, ...comPasta, ESTRAGAR: '1' });
    ok(estragado.code !== 0, R + 'se o conteúdo que voltou não bate com a assinatura, a conferência reprova');

    // 4) política do Mac: Developer ID que falha cai para ad-hoc e diz o motivo REAL
    const sonda = montar('Politica');
    marcar(sonda);
    const logs = path.join(dir, 'logs');
    fs.mkdirSync(logs);
    const falsa = 'Developer ID Application: Ninguém de Tal (XXXXXXXXXX)';
    const mac = sh('ct_assinar_mac "$APP" "$LOGS" "$ID"', { APP: sonda, LOGS: logs, ID: falsa });
    ok(mac.code === 0 && estrito(sonda) && adhoc(sonda),
      R + 'Developer ID que falha cai para ad-hoc, e o app sai assinado e íntegro');
    ok(/motivo: .*no identity found/.test(mac.saida), R + 'a falha mostra a primeira linha real do codesign.log');
    ok(!/internet|\brede\b/i.test(mac.saida), R + 'e não culpa a internet quando o log não fala em timestamp');
    ok(/Gatekeeper: rejeitado.*esperado em assinatura ad-hoc/.test(mac.saida),
      R + 'e, caída para ad-hoc, mostra o veredito do Gatekeeper como o esperado do ad-hoc');

    // 5) o diagnóstico só sugere rede quando o log fala no carimbo de tempo
    const logTs = path.join(dir, 'timestamp.log');
    fs.writeFileSync(logTs, 'Sonda.app: replacing existing signature\nThe timestamp service is not available.\n');
    const ts = sh('ct_motivo_codesign "$LOG"', { LOG: logTs });
    ok(/motivo: The timestamp service is not available\./.test(ts.saida) && /\brede\b/.test(ts.saida),
      R + 'falha no carimbo de tempo: mostra a linha (pula o "replacing") e sugere a rede');
    const logDet = path.join(dir, 'detrito.log');
    fs.writeFileSync(logDet, noLugar.saida);
    const det = sh('ct_motivo_codesign "$LOG"', { LOG: logDet });
    ok(/motivo: .*detritus/.test(det.saida) && /iCloud/.test(det.saida) && !/internet|\brede\b/i.test(det.saida),
      R + 'falha por detrito: mostra a linha real, aponta a pasta sincronizada e não fala em rede');

    // 6) assinar não basta: o que não passa no --strict não volta. Symlink absoluto para fora
    //    do bundle assina (rc 0) e reprova no --strict ("invalid destination for symbolic link").
    const comLink = montar('Link');
    fs.symlinkSync('/etc/hosts', path.join(comLink, 'Contents', 'Resources', 'fora'));
    const logLink = path.join(dir, 'link.log');
    const link = sh('ct_assinar_limpo "$APP" "$LOG" --force --sign -', { APP: comLink, LOG: logLink });
    ok(link.code !== 0 && /symbolic link/.test(fs.readFileSync(logLink, 'utf8')),
      R + 'assinatura que reprova no --verify --strict não conta como sucesso (e o motivo fica no log)');
    ok(!fs.existsSync(path.join(comLink, 'Contents', '_CodeSignature')) && fs.existsSync(indexDe(comLink)),
      R + 'e o app de origem fica como estava, sem a cópia reprovada por cima');

    // 6b) o veredito do Gatekeeper vem à parte da assinatura (01/10/2026). O app instalado
    //     passava no codesign --strict e o spctl dizia "rejected / Unnotarized Developer ID";
    //     o build anunciava "assinado para DISTRIBUIÇÃO". Um `spctl` de mentira no PATH responde
    //     cada caso NO FORMATO DO REAL: escreve no stderr, sai com 0 (aceito), 3 (recusa) ou 1
    //     (erro de selo/certificado, sem linha source=), e recusa chamada que não seja a
    //     avaliação de execução. Um stub no stdout, ou com formato inventado, deixava passar
    //     verde um módulo que derrubaria o build de verdade (medido na revisão do item 2).
    const gate = montar('Gate');
    sh('ct_assinar_limpo "$APP" "$LOG" --force --sign -', { APP: gate, LOG: path.join(dir, 'gate.log') });
    const binG = path.join(dir, 'bin-spctl');
    fs.mkdirSync(binG);
    fs.writeFileSync(path.join(binG, 'spctl'), [
      '#!/bin/bash',
      'case " $* " in *" --assess "*"--type execute "*) ;; *) echo "args inesperados: $*" >&2; exit 9;; esac',
      'alvo="${@: -1}"',
      'case "$SPCTL_CASO" in',
      '  aceito) printf "%s: accepted\\nsource=Notarized Developer ID\\norigin=Developer ID Application: Teste (XXXXXXXXXX)\\n" "$alvo" >&2; exit 0;;',
      '  semnotarizar) printf "%s: rejected\\nsource=Unnotarized Developer ID\\norigin=Developer ID Application: Teste (XXXXXXXXXX)\\n" "$alvo" >&2; exit 3;;',
      '  desligado) printf "%s: accepted\\nsource=Unnotarized Developer ID\\noverride=security disabled\\norigin=Developer ID Application: Teste (XXXXXXXXXX)\\n" "$alvo" >&2; exit 0;;',
      '  desenvolvimento) printf "%s: rejected\\norigin=Apple Development: Teste (YYYYYYYYYY)\\n" "$alvo" >&2; exit 3;;',
      '  revogado) printf "%s: CSSMERR_TP_CERT_REVOKED\\n" "$alvo" >&2; exit 1;;',
      'esac'].join('\n'), { mode: 0o755 });
    const comStub = (caso) => ({ PATH: binG + ':' + process.env.PATH, SPCTL_CASO: caso });
    const veredito = (caso, modo, alvo = gate) => sh('ct_veredito_gatekeeper "$APP" ' + modo, { APP: alvo, ...comStub(caso) });
    const semArgsErrados = (r) => !/args inesperados/.test(r.saida);
    const semNot = veredito('semnotarizar', 'devid');
    ok(semNot.code === 0 && semArgsErrados(semNot) && /Unnotarized Developer ID/.test(semNot.saida) && /notariza[çc][ãa]o/i.test(semNot.saida),
      R + 'Developer ID sem notarização: o veredito diz "Unnotarized Developer ID" e que falta a notarização');
    ok(/bash mac\/empacotar\.sh/.test(semNot.saida) && !/DISTRIBUI[ÇC][ÃA]O|pronto para distribuir|✓/i.test(semNot.saida),
      R + 'e dá o próximo comando (bash mac/empacotar.sh) sem ✓ e sem chamar o app de pronto para distribuir');
    const aceito = veredito('aceito', 'devid');
    ok(aceito.code === 0 && /✓ Gatekeeper: aceito \(Notarized Developer ID\)/.test(aceito.saida),
      R + 'app notarizado: o veredito é "✓ aceito (Notarized Developer ID)"');
    const desligado = veredito('desligado', 'devid');
    ok(desligado.code === 0 && !/✓/.test(desligado.saida) && /override=security disabled/.test(desligado.saida)
      && /bash mac\/empacotar\.sh/.test(desligado.saida),
      R + 'Gatekeeper desligado (accepted com override=): nada de ✓; diz que não há veredito e repete o aviso de notarização');
    const dev = veredito('desenvolvimento', 'devid');
    ok(dev.code === 0 && /não é Developer ID/.test(dev.saida) && /Apple Development/.test(dev.saida) && !/revogado/.test(dev.saida),
      R + 'identidade Apple Development: avisa que não serve para distribuir, sem derrubar o build nem culpar o certificado');
    const revogado = veredito('revogado', 'devid');
    ok(revogado.code !== 0 && /REJEITADO por motivo de assinatura — CSSMERR_TP_CERT_REVOKED/.test(revogado.saida)
      && !/empacotar/.test(revogado.saida) && !revogado.saida.includes(gate + ':'),
      R + 'certificado revogado (formato real: "<app>: <motivo>", sem source=) é erro de assinatura e para o build');
    const adhocV = veredito('revogado', 'adhoc');
    ok(adhocV.code === 0 && /esperado em assinatura ad-hoc/.test(adhocV.saida),
      R + 'ad-hoc recusado pelo Gatekeeper é o esperado e não derruba o build');

    //     Com o spctl de VERDADE (nenhum certificado é preciso):
    const real = sh('ct_veredito_gatekeeper "$APP" adhoc', { APP: gate });
    ok(estrito(gate) && real.code === 0 && /Gatekeeper: rejeitado — esperado em assinatura ad-hoc/.test(real.saida),
      R + 'spctl real, ad-hoc íntegro: o veredito sai por extenso e o build segue');
    //     Selo quebrado E pasta que remarca a raiz: obriga o ramo da cópia temporária (o --strict
    //     reprova no lugar) e prova que a cópia some, que o caminho dela não vaza na mensagem e
    //     que a avaliação mira o bundle certo dentro da cópia.
    const quebradoG = path.join(dir, 'GateQuebrado.app');
    rodar('ditto', [gate, quebradoG]);
    fs.appendFileSync(indexDe(quebradoG), '<!-- mexido depois de assinar -->');
    marcar(quebradoG);
    const antesTmp = fs.readdirSync(tmpBase).length;
    const selo = sh('ct_veredito_gatekeeper "$APP" devid', { APP: quebradoG });
    ok(selo.code !== 0 && /REJEITADO por motivo de assinatura/.test(selo.saida) && /sealed resource is missing or invalid/.test(selo.saida),
      R + 'spctl real, selo quebrado em modo Developer ID: erro de assinatura, o build para (' + selo.saida.trim().split('\n')[0] + ')');
    ok(!selo.saida.includes(tmpBase) && fs.readdirSync(tmpBase).length === antesTmp,
      R + 'a cópia temporária da pasta remarcada é apagada e o caminho dela não aparece na mensagem');

    // 6c) a política do Mac pelo caminho Developer ID, sem certificado: um `codesign` de mentira
    //     troca a identidade por "-" e tira o carimbo (que exige rede); o resto vai ao de verdade.
    //     Prova que ct_assinar_mac CONSULTA o Gatekeeper e obedece ao veredito — uma regex no
    //     texto do módulo não pega um "return 0" posto antes da chamada.
    const binC = path.join(dir, 'bin-codesign');
    fs.mkdirSync(binC);
    fs.writeFileSync(path.join(binC, 'codesign'), [
      '#!/bin/bash',
      'args=(); troca=0',
      'for a in "$@"; do',
      '  if [ "$troca" = 1 ]; then args+=("-"); troca=0; continue; fi',
      '  case "$a" in --sign) args+=("$a"); troca=1;; --timestamp) ;; *) args+=("$a");; esac',
      'done',
      'exec /usr/bin/codesign "${args[@]}"'].join('\n'), { mode: 0o755 });
    const devid = 'Developer ID Application: Teste de Mentira (XXXXXXXXXX)';
    const politica = (caso, nome) => {
      const alvo = montar(nome);
      const logsP = path.join(dir, 'logs-' + nome);
      fs.mkdirSync(logsP);
      return sh('ct_assinar_mac "$APP" "$LOGS" "$ID"',
        { APP: alvo, LOGS: logsP, ID: devid, PATH: binC + ':' + binG + ':' + process.env.PATH, SPCTL_CASO: caso });
    };
    const polSem = politica('semnotarizar', 'PolSem');
    ok(polSem.code === 0 && /assinado com Developer ID/.test(polSem.saida) && /Unnotarized Developer ID/.test(polSem.saida)
      && /bash mac\/empacotar\.sh/.test(polSem.saida) && !/Caindo para ad-hoc/.test(polSem.saida),
      R + 'ct_assinar_mac (Developer ID, sem notarização): assina, consulta o Gatekeeper e segue com o aviso de notarizar');
    const polRev = politica('revogado', 'PolRev');
    ok(polRev.code !== 0 && /REJEITADO por motivo de assinatura/.test(polRev.saida),
      R + 'ct_assinar_mac (Developer ID recusado por motivo de assinatura): devolve erro e o build para');

    // 7) se nem o ad-hoc assina, erro — e o app de origem continua lá
    const quebrado = montar('Quebrado', { executavelPasta: true });
    marcar(quebrado);
    const logs2 = path.join(dir, 'logs-quebrado');
    fs.mkdirSync(logs2);
    const nada = sh('ct_assinar_mac "$APP" "$LOGS" ""', { APP: quebrado, LOGS: logs2 });
    ok(nada.code !== 0, R + 'se nem o ad-hoc assina, ct_assinar_mac devolve erro (exit ' + nada.code + ')');
    ok(/nem a assinatura ad-hoc/.test(nada.saida) && /motivo: \S/.test(nada.saida), R + 'e diz por quê');
    ok(fs.existsSync(path.join(quebrado, 'Contents', 'Info.plist')) && fs.existsSync(indexDe(quebrado)),
      R + 'o app de origem não some quando a assinatura falha');

    ok(fs.readdirSync(tmpBase).length === 0, R + 'nenhuma cópia temporária fica para trás, nem nas falhas ('
      + fs.readdirSync(tmpBase).join(', ') + ')');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  // 8) os scripts de build usam o módulo e param quando ele falha
  const semComentario = (t) => t.replace(/^\s*#.*$/gm, '');
  const scripts = {
    'mac/build-app.sh': fs.readFileSync(path.join(RAIZ, 'mac', 'build-app.sh'), 'utf8'),
    'ios/build-ipad.sh': fs.readFileSync(path.join(RAIZ, 'ios', 'build-ipad.sh'), 'utf8'),
  };
  for (const [nome, txt] of Object.entries(scripts)) {
    ok(/^source "\$ROOT\/scripts\/assinar-app\.sh"$/m.test(txt), R + nome + ' carrega scripts/assinar-app.sh');
    ok(!/codesign\s+--force/.test(semComentario(txt)), R + nome + ' não assina mais no lugar (nenhum codesign --force fora do módulo)');
  }
  const macTxt = scripts['mac/build-app.sh'];
  ok(/^ct_assinar_mac "\$APP" .*\|\|\s*exit [1-9]/m.test(macTxt), R + 'mac/build-app.sh sai com erro quando nem o ad-hoc assina');
  ok(!/sem internet/.test(semComentario(macTxt)), R + 'mac/build-app.sh não supõe mais "sem internet"');
  const moduloTxt = semComentario(fs.readFileSync(MODULO, 'utf8'));
  ok(!/assinado para DISTRIBUI/.test(moduloTxt) && /ct_veredito_gatekeeper "\$app" devid \|\| return 1/.test(moduloTxt),
    R + 'a política do Mac não chama mais o app de "assinado para DISTRIBUIÇÃO" e para o build se o Gatekeeper recusa a assinatura');
  ok(/CT_REMARCADO[\s\S]{0,600}ditto --norsrc --noextattr --noacl[^\n]*\/Applications\//.test(macTxt),
    R + 'mac/build-app.sh ensina a instalar com ditto sem atributos quando a pasta remarcou o bundle');
  const ipadTxt = scripts['ios/build-ipad.sh'];
  const i0 = ipadTxt.indexOf('ios_assinar() {');
  const fn = i0 >= 0 ? ipadTxt.slice(i0, ipadTxt.indexOf('\n  }', i0)) : '';
  ok(/ct_assinar_limpo "\$APP"/.test(fn) && /exit 1/.test(fn) && (ipadTxt.match(/^\s*ios_assinar --force/gm) || []).length === 2,
    R + 'ios/build-ipad.sh assina pela cópia limpa nos dois caminhos e sai com erro se falhar');
  ok(/não consegui ler os entitlements[^\n]*\n\s*exit 1/.test(ipadTxt),
    R + 'ios/build-ipad.sh sem entitlements do perfil sai com erro, em vez de seguir até o "Pronto"');
}

// Execução avulsa: node tests/assinatura-limpa.mjs
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const falhas = [];
  const ok = (cond, label) => { console.log((cond ? '✓ ' : '✗ ') + label); if (!cond) falhas.push(label); };
  await testarAssinaturaLimpa(ok);
  console.log(falhas.length ? ('\nFALHAS: ' + falhas.length) : '\nTODOS OS TESTES PASSARAM');
  process.exit(falhas.length ? 1 : 0);
}
