/* WIDGETS — a extensão compila para o Mac e para o iPhone/iPad (simulador), e as telas pintam no tamanho certo de
   cada família, no claro, no escuro e na baixa estimulação (widget/Ferramentas/capturas.swift). As imagens ficam em
   <tmp>/ct-widget-capturas para OLHAR antes de instalar: o teste mede tamanho e se pinta; corte de texto se confere
   olhando as capturas "longo" (matéria e concurso de nome comprido). Só no macOS com swiftc; fora disso, pula. */
import fs from 'fs';
import path from 'path';
import os from 'os';
import zlib from 'zlib';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lista = (d) => fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.swift')).sort().map(f => path.join(d, f)) : [];
const erros = (r) => (r.stderr || '').split('\n').filter(l => /error:/.test(l)).slice(0, 3).join(' | ');

function pngInfo(arq) {
  const b = fs.readFileSync(arq);
  if (b.length < 33 || b.readUInt32BE(0) !== 0x89504e47) return null;
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  const idat = []; let i = 8;
  while (i + 8 <= b.length) { const len = b.readUInt32BE(i); const tipo = b.toString('ascii', i + 4, i + 8); if (tipo === 'IDAT') idat.push(b.subarray(i + 8, i + 8 + len)); i += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const vistos = new Set(); for (let k = 0; k < raw.length; k += 7) vistos.add(raw[k]);
  return { w, h, distintos: vistos.size };
}

export async function testarWidgetCapturas(ok) {
  const R = 'WIDGET TELAS ';
  if (process.platform !== 'darwin' || spawnSync('swiftc', ['--version']).status !== 0) { console.log('⚠ ' + R + 'só no macOS com swiftc: pulado'); return; }
  const sdk = (s) => spawnSync('xcrun', ['--sdk', s, '--show-sdk-path'], { encoding: 'utf8' }).stdout.trim();
  const comum = lista(path.join(RAIZ, 'ios', 'vendor', 'widget'));
  const ext = lista(path.join(RAIZ, 'widget', 'Sources'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-widget-bin-'));
  try {
    for (const [nome, alvo, s] of [['Mac', 'arm64-apple-macos14.0', 'macosx'], ['simulador do iOS', 'arm64-apple-ios17.0-simulator', 'iphonesimulator']]) {
      const r = spawnSync('swiftc', ['-target', alvo, '-sdk', sdk(s), '-parse-as-library', '-application-extension', ...comum, ...ext,
        '-o', path.join(tmp, 'w-' + s), '-framework', 'WidgetKit', '-framework', 'SwiftUI', '-Xlinker', '-e', '-Xlinker', '_NSExtensionMain'], { encoding: 'utf8' });
      ok(r.status === 0, R + 'a extensão compila para o ' + nome + (r.status === 0 ? '' : ' (' + erros(r) + ')'));
    }
    const semMain = ext.filter(f => path.basename(f) !== 'CatedraWidgetBundle.swift');
    const bin = path.join(tmp, 'capturas');
    const c = spawnSync('swiftc', ['-target', 'arm64-apple-macos14.0', '-sdk', sdk('macosx'), ...comum, ...semMain,
      path.join(RAIZ, 'widget', 'Ferramentas', 'capturas.swift'), '-o', bin, '-framework', 'SwiftUI', '-framework', 'AppKit', '-framework', 'WidgetKit'], { encoding: 'utf8' });
    ok(c.status === 0, R + 'o renderizador de capturas compila' + (c.status === 0 ? '' : ' (' + erros(c) + ')'));
    if (c.status !== 0) return;
    const saida = path.join(os.tmpdir(), 'ct-widget-capturas');
    fs.rmSync(saida, { recursive: true, force: true });
    const run = spawnSync(bin, [saida, path.join(RAIZ, 'widget', 'dodia.json')], { encoding: 'utf8' });
    ok(run.status === 0, R + 'o renderizador gerou todas as capturas' + (run.status === 0 ? '' : ' (' + ((run.stdout || '') + (run.stderr || '')).split('\n').filter(l => /FALHA|rror/.test(l)).slice(0, 3).join(' | ') + ')'));
    if (!fs.existsSync(path.join(saida, 'indice.json'))) return;
    const indice = JSON.parse(fs.readFileSync(path.join(saida, 'indice.json'), 'utf8'));
    const tamErrado = [], lisas = [];
    for (const it of indice) {
      const inf = pngInfo(path.join(saida, it.arquivo));
      if (!inf || inf.w !== it.largura || inf.h !== it.altura) tamErrado.push(it.arquivo);
      else if (inf.distintos < 12) lisas.push(it.arquivo);
    }
    ok(indice.length >= 60, R + 'há capturas de todas as telas e variantes (' + indice.length + ')');
    ok(!tamErrado.length, R + 'toda captura tem o tamanho da família ×2' + (tamErrado.length ? ' — erradas: ' + tamErrado.slice(0, 4).join(', ') : ''));
    ok(!lisas.length, R + 'nenhuma captura sai lisa (todas pintam)' + (lisas.length ? ' — lisas: ' + lisas.slice(0, 4).join(', ') : ''));
    console.log('  capturas para olhar: ' + saida);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const falhas = [];
  await testarWidgetCapturas((c, l) => { console.log((c ? '✓ ' : '✗ ') + l); if (!c) falhas.push(l); });
  process.exit(falhas.length ? 1 : 0);
}
