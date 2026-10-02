/* WIDGETS — coerência do build: os scripts montam e assinam o .appex (antes do app), os Info.plist declaram a
   extensão e o esquema catedra://, os grupos de apps batem entre entitlements e código, e o rascunho antigo
   (mac/Widget) saiu. Lê só arquivos: roda na CI. A prova de que FUNCIONA é a instalação (Tasks 14, 16 e 17). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (r) => fs.existsSync(path.join(RAIZ, r)) ? fs.readFileSync(path.join(RAIZ, r), 'utf8') : '';
const semComentario = (t) => t.replace(/^\s*#.*$/gm, '');
const swifts = (d) => fs.existsSync(path.join(RAIZ, d)) ? fs.readdirSync(path.join(RAIZ, d)).filter(f => f.endsWith('.swift')) : [];

export async function testarWidgetBuild(ok) {
  const R = 'WIDGET BUILD ';
  const grupo = ler('ios/vendor/widget/WidgetGrupo.swift');
  ok(/static let id = "2ZT3GWTS9Z\.com\.catedra"/.test(grupo) && /static let id = "group\.com\.catedra"/.test(grupo), R + 'WidgetGrupo declara os dois grupos (Mac e iOS)');
  ok(!fs.existsSync(path.join(RAIZ, 'mac', 'Widget')), R + 'o rascunho mac/Widget saiu');
  const mains = swifts('widget/Sources').filter(f => /^@main\b/m.test(ler('widget/Sources/' + f)));
  ok(mains.length === 1 && mains[0] === 'CatedraWidgetBundle.swift', R + 'a extensão tem um @main só, no CatedraWidgetBundle.swift');
  ok(!swifts('ios/vendor/widget').some(f => /^@main\b/m.test(ler('ios/vendor/widget/' + f))), R + 'nada de @main em ios/vendor/widget (o app também compila essa pasta)');

  const mac = ler('mac/build-app.sh'), macSem = semComentario(mac);
  ok(/Contents\/PlugIns\/\$WIDGET_EXEC\.appex/.test(macSem), R + 'mac/build-app.sh monta o .appex em Contents/PlugIns');
  ok(/-parse-as-library -application-extension/.test(macSem) && /-Xlinker -e -Xlinker _NSExtensionMain/.test(macSem),
    R + 'o widget do Mac compila como extensão e entra por _NSExtensionMain (sem isso cai no arranque — Task 0)');
  ok(/com\.apple\.widgetkit-extension/.test(mac) && /\$BUNDLE_ID\.widget/.test(mac), R + 'o Info.plist do .appex do Mac declara a extensão de widget e o identificador');
  ok(/CFBundleURLSchemes<\/key><array><string>catedra<\/string>/.test(mac), R + 'o app do Mac registra o esquema catedra://');
  ok(/widget\/dodia\.json/.test(macSem), R + 'o dodia.json vai para dentro do .appex do Mac');
  ok(/^ct_assinar_mac "\$APP" "\$BUILD" "\$SIGN_ID" "\$HERE\/Catedra\.entitlements" "\$APPEX" "\$ROOT\/widget\/mac\.entitlements" \|\| exit 1$/m.test(mac),
    R + 'o Mac assina o .appex com os entitlements do widget e o app com os dele');
  ok(/ios\/vendor\/widget/.test(macSem) && /-framework WidgetKit/.test(macSem), R + 'o app do Mac compila o código compartilhado do widget');
  ok(/scripts\/build-macos\.mjs/.test(macSem) && /CatedraSupabaseURL/.test(mac) && /CatedraSupabaseChave/.test(mac),
    R + 'o .appex do Mac recebe a URL e a chave pública do Supabase lidas de scripts/build-macos.mjs');
  ok(/^if montar_widget; then$/m.test(macSem) && /rm -rf "\$APPEX"\n\s*echo "\s*⚠ widget não incluído: \$WIDGET_MOTIVO/.test(macSem)
    && !/montar_widget\(\) \{[\s\S]*?\bexit 1\b[\s\S]*?\n\}/.test(macSem.slice(macSem.indexOf('montar_widget() {'), macSem.indexOf('if montar_widget; then'))),
    R + 'falha do widget (chave ilegível, dodia.json ausente, swiftc) não derruba o build: avisa e o app segue sem o .appex');
  const entW = ler('widget/mac.entitlements'), entA = ler('mac/Catedra.entitlements');
  ok(/com\.apple\.security\.app-sandbox<\/key>\s*<true\/>/.test(entW) && /<string>2ZT3GWTS9Z\.com\.catedra<\/string>/.test(entW) && /com\.apple\.security\.network\.client<\/key>\s*<true\/>/.test(entW),
    R + 'o widget do Mac é sandboxed, no grupo do time e com rede de saída');
  ok(/<string>2ZT3GWTS9Z\.com\.catedra<\/string>/.test(entA) && !/app-sandbox|group\.com\.catedra\.desktop/.test(entA), R + 'o app do Mac leva só o grupo do time (sem sandbox, sem o grupo velho)');
  const ass = ler('scripts/assinar-app.sh');
  const iWid = ass.indexOf('codesign-widget.log'), iApp = ass.indexOf('"$logs/codesign.log"');
  ok(iWid > 0 && iApp > iWid, R + 'ct_assinar_mac assina o .appex ANTES do app');
  ok(/rm -rf "\$appex"/.test(ass), R + 'no ad-hoc o widget sai do app (o macOS não registra widget ad-hoc)');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const falhas = [];
  await testarWidgetBuild((c, l) => { console.log((c ? '✓ ' : '✗ ') + l); if (!c) falhas.push(l); });
  process.exit(falhas.length ? 1 : 0);
}
