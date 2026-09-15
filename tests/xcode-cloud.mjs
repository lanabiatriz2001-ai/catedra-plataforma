/* XCODE CLOUD COMPILA O MESMO APP QUE O build-ipad.sh (11/09/2026)

   O check "Catedra | Cátedra | Build - iOS" falhou em TODOS os 108 builds desde 17/08/2026,
   por dois furos que se somavam:
   · o projeto ios/Catedra.xcodeproj empacota a pasta `web` (../mac/build/web), gerada por
     scripts/build-macos.mjs e não versionada, e o Xcode Cloud não gerava nada antes de
     compilar ("The file “web” couldn’t be opened because there is no such file");
   · o alvo compilava só o Sources/main.swift, enquanto o build-ipad.sh compila também os
     97 arquivos de ios/vendor (LEGIS, JURIS, comum): o main.swift não achava LibraryStore,
     AppStore, StudyClock…

   O que se prova, sem Xcode (roda no Ubuntu da CI):
   · ios/ci_scripts/ci_post_clone.sh existe AO LADO do .xcodeproj (é lá que a Apple procura,
     não na raiz), tem shebang e bit de execução, para em erro e gera o bundle com o alvo
     do iPad;
   · a pasta `web` do projeto aponta exatamente para a saída do build-macos.mjs;
   · o alvo compila ios/vendor inteiro por pasta sincronizada (arquivo novo entra sozinho),
     sem excluir nenhum .swift; as exceções existem no disco e não são código;
   · a fase "Gerar bundle web" usa o alvo do iPad e para com erro legível quando falta o
     bundle;
   · controle: o projeto antigo (sem a pasta sincronizada) REPROVA na mesma régua.

   Roda sozinho: node tests/xcode-cloud.mjs */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IOS = path.join(RAIZ, 'ios');
const PBX = path.join(IOS, 'Catedra.xcodeproj', 'project.pbxproj');
const CI = path.join(IOS, 'ci_scripts', 'ci_post_clone.sh');

// Problemas do projeto que impedem o Xcode Cloud de compilar o app do build-ipad.sh.
export function problemasDoProjeto(pbx) {
  const p = [];
  const web = pbx.match(/\/\* web \*\/ = \{isa = PBXFileReference;[^}]*path = ([^;]+);/);
  if (!web) p.push('sem referência à pasta web');
  else {
    const saida = fs.readFileSync(path.join(RAIZ, 'scripts', 'build-macos.mjs'), 'utf8')
      .match(/const OUT = join\(ROOT, ([^)]+)\)/);
    const partes = saida ? saida[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')) : [];
    if (path.resolve(IOS, web[1]) !== path.join(RAIZ, ...partes)) p.push(`web aponta para ${web[1]}, fora da saída do build-macos.mjs`);
  }
  const grupo = pbx.match(/(\w+) \/\* vendor \*\/ = \{\s*isa = PBXFileSystemSynchronizedRootGroup;([\s\S]*?)\n\t\t\};/);
  if (!grupo) p.push('ios/vendor não é pasta sincronizada do projeto');
  else {
    if (!/path = vendor;/.test(grupo[2])) p.push('a pasta sincronizada não aponta para vendor');
    const alvo = pbx.match(/fileSystemSynchronizedGroups = \(([^)]*)\);/);
    if (!alvo || !alvo[1].includes(grupo[1])) p.push('o alvo Catedra não compila a pasta vendor');
    for (const m of pbx.matchAll(/membershipExceptions = \(([^)]*)\);/g)) {
      for (const f of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
        if (f.endsWith('.swift')) p.push(`exceção tira ${f} do build (o build-ipad.sh compila)`);
        if (!fs.existsSync(path.join(IOS, 'vendor', f))) p.push(`exceção para arquivo que não existe: ${f}`);
      }
    }
  }
  if (!/main\.swift in Sources/.test(pbx)) p.push('main.swift fora do alvo');
  if (!/objectVersion = 77;/.test(pbx)) p.push('objectVersion < 77 (pasta sincronizada exige o formato do Xcode 16)');
  const fase = pbx.match(/name = "Gerar bundle web";[\s\S]*?shellScript = "([^\n]*)";/);
  if (!fase) p.push('sem a fase "Gerar bundle web"');
  else {
    if (!/CATEDRA_ALVO=iPadOS node scripts\/build-macos\.mjs/.test(fase[1])) p.push('a fase gera o bundle sem o alvo do iPad');
    if (!/mac\/build\/web\/index\.html[\s\S]*error:[\s\S]*exit 1/.test(fase[1])) p.push('a fase não para com erro quando falta o bundle');
  }
  return p;
}

export async function testarXcodeCloud(ok) {
  // O script de pós-clone: lugar, formato e o que ele faz.
  ok(fs.existsSync(CI) && path.dirname(path.dirname(CI)) === path.dirname(path.dirname(PBX)),
    'XC1 ci_post_clone.sh fica em ios/ci_scripts, na mesma pasta do Catedra.xcodeproj');
  const sh = fs.existsSync(CI) ? fs.readFileSync(CI, 'utf8') : '';
  ok(sh.startsWith('#!/bin/sh\n') && (fs.existsSync(CI) && (fs.statSync(CI).mode & 0o111) !== 0),
    'XC2 ci_post_clone.sh tem shebang e bit de execução (sem eles o Xcode Cloud roda com zsh)');
  ok(/^set -eu$/m.test(sh) && /CATEDRA_ALVO=iPadOS node scripts\/build-macos\.mjs/.test(sh)
    && /command -v node[\s\S]*brew install node/.test(sh) && /CI_PRIMARY_REPOSITORY_PATH/.test(sh),
    'XC3 o pós-clone instala o Node se faltar, gera o bundle do iPad na raiz do clone e para em erro');

  // O projeto.
  const pbx = fs.readFileSync(PBX, 'utf8');
  const probs = problemasDoProjeto(pbx);
  ok(probs.length === 0, 'XC4 o projeto compila ios/vendor + main.swift e empacota a saída do build-macos.mjs'
    + (probs.length ? ' — ' + probs.join('; ') : ''));

  // Controle: o projeto de antes (sem a pasta sincronizada) tem de reprovar na mesma régua.
  const antigo = pbx.replace(/\t\t\tfileSystemSynchronizedGroups = \([^)]*\);\n/, '')
    .replace(/\/\* Begin PBXFileSystemSynchronizedRootGroup section \*\/[\s\S]*?\/\* End PBXFileSystemSynchronizedRootGroup section \*\/\n/, '');
  ok(antigo !== pbx && problemasDoProjeto(antigo).some((s) => /vendor/.test(s)),
    'XC5 controle: sem a pasta sincronizada o mesmo projeto reprova (a régua enxerga o furo)');

  /* O QUE O XCODE CLOUD MANDA PARA O TESTFLIGHT tem de bater com o que o build-ipad.sh
     instala nos aparelhos. Os dois caminhos já divergiram em silêncio: o script escrevia
     UIDeviceFamily 1 e 2 (universal) e o projeto ficou em TARGETED_DEVICE_FAMILY = 2, então
     o build do TestFlight sairia SÓ PARA IPAD — sem dar para instalar no iPhone. E a
     resposta de criptografia de exportação existia só no script; sem ela no Info.plist do
     projeto, o TestFlight prende cada build perguntando antes de liberar aos testadores. */
  const plist = fs.readFileSync(path.join(IOS, 'Info.plist'), 'utf8');
  const sh2 = fs.readFileSync(path.join(IOS, 'build-ipad.sh'), 'utf8');
  const scriptUniversal = /<key>UIDeviceFamily<\/key><array><integer>1<\/integer><integer>2<\/integer><\/array>/.test(sh2);
  const projetoUniversal = /TARGETED_DEVICE_FAMILY = "1,2";/.test(pbx)
    && !/TARGETED_DEVICE_FAMILY = 2;/.test(pbx);
  ok(scriptUniversal && projetoUniversal,
    'XC6 projeto e build-ipad.sh concordam: o app é universal (iPhone + iPad) nos DOIS caminhos'
    + (scriptUniversal ? '' : ' — o script deixou de escrever UIDeviceFamily 1 e 2')
    + (projetoUniversal ? '' : ' — o projeto não está em TARGETED_DEVICE_FAMILY "1,2"'));

  const respostaNoPlist = /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/.test(plist);
  const respostaNoScript = /ITSAppUsesNonExemptEncryption/.test(sh2);
  ok(respostaNoPlist && respostaNoScript,
    'XC7 a resposta de criptografia de exportação está nos DOIS caminhos (senão o TestFlight prende o build)'
    + (respostaNoPlist ? '' : ' — falta em ios/Info.plist, que é por onde o Xcode Cloud arquiva')
    + (respostaNoScript ? '' : ' — falta em ios/build-ipad.sh'));
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const falhas = [];
  await testarXcodeCloud((c, l) => { console.log((c ? '✓ ' : '✗ ') + l); if (!c) falhas.push(l); });
  process.exit(falhas.length ? 1 : 0);
}
