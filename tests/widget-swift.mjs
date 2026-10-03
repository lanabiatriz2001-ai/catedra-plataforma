/* WIDGETS — as contas do dia, a escolha nuvem × cópia local, as cores, os links, o "do dia" e a leitura da nuvem,
   em Swift de verdade: os MESMOS arquivos de ios/vendor/widget que entram no app e no widget, compilados por swiftc
   com os casos de widget/Testes/main.swift. A tabela de cores vem do próprio Catedra.dc.html (fonte única).
   Roda sozinho: node tests/widget-swift.mjs. Sem swiftc (a CI é ubuntu sem Swift), avisa e não reprova. */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { carregarCoresRamo } from '../scripts/lib-cores-ramo.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// só os arquivos SEM WidgetKit/FileManager de grupo (WidgetGrupo fica de fora: API só da Apple)
const PUROS = ['WidgetResumo', 'WidgetHoje', 'WidgetSelecao', 'WidgetCores', 'WidgetLinks', 'WidgetDoDia', 'WidgetNuvem']
  .map(n => path.join(RAIZ, 'ios', 'vendor', 'widget', n + '.swift')).filter(f => fs.existsSync(f));

export async function testarWidgetSwift(ok) {
  const R = 'WIDGET SWIFT ';
  if (spawnSync('swiftc', ['--version'], { encoding: 'utf8' }).status !== 0) { console.log('⚠ ' + R + 'sem swiftc nesta máquina: casos pulados (rodam no Mac)'); return; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-widget-'));
  try {
    const { tabela } = carregarCoresRamo(RAIZ);
    const linhas = Object.entries(tabela).map(([k, v]) => `    ("${k}", "${v.c}", "${v.d}"),`).join('\n');
    fs.writeFileSync(path.join(dir, 'CoresRamo.swift'), `let CORES_RAMO: [(String, String, String)] = [\n${linhas}\n]\n`);
    const bin = path.join(dir, 'casos');
    const args = ['-O', ...PUROS, path.join(dir, 'CoresRamo.swift'), path.join(RAIZ, 'widget', 'Testes', 'main.swift'), '-o', bin];
    if (process.platform === 'darwin') {
      const sdk = spawnSync('xcrun', ['--sdk', 'macosx', '--show-sdk-path'], { encoding: 'utf8' }).stdout.trim();
      if (sdk) args.unshift('-sdk', sdk);
    }
    const comp = spawnSync('swiftc', args, { encoding: 'utf8' });
    ok(comp.status === 0, R + 'os arquivos puros do widget compilam com os casos'
      + (comp.status === 0 ? '' : ' (' + (comp.stderr || '').split('\n').filter(l => /error:/.test(l)).slice(0, 3).join(' | ') + ')'));
    if (comp.status !== 0) return;
    const run = spawnSync(bin, [], { encoding: 'utf8' });
    for (const l of (run.stdout || '').split('\n')) {
      const m = /^(ok|FALHA) (.+)$/.exec(l.trim());
      if (m) ok(m[1] === 'ok', R + m[2]);
    }
    ok(run.status === 0 && /^FIM \d+$/m.test(run.stdout || ''), R + 'o executável de casos terminou inteiro');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const falhas = [];
  await testarWidgetSwift((c, l) => { console.log((c ? '✓ ' : '✗ ') + l); if (!c) falhas.push(l); });
  process.exit(falhas.length ? 1 : 0);
}
