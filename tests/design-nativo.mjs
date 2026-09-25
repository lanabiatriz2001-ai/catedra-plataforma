/* BASE VISUAL NATIVA (entrega 1 da reformulação LEGIS/JURIS, 25/09/2026)

   Prova duas coisas:
   · a catraca: fora de ios/vendor/design, o LEGIS e o JURIS nativos (Mac e iPad) não ganham
     nenhum hex, .white/.black literal, .system(size:) ou emoji novo — a contagem só desce
     (scripts/design-nativo-base.json);
   · no Mac, os testes Swift da base (cor, contraste, fontes, escala) passam
     (scripts/testar-design-nativo.sh). Fora do macOS (CI Ubuntu) essa parte é pulada.

   Roda sozinho: node tests/design-nativo.mjs */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function testarDesignNativo(ok) {
  const V = await import('../scripts/verificar-design-nativo.mjs');

  const amostra = 'Color(hex: 0x123456); Text("a").foregroundStyle(.white); .font(.system(size: 12))';
  ok((amostra.match(V.PADROES.cores) || []).length === 1
    && (amostra.match(V.PADROES.pretoBranco) || []).length === 1
    && (amostra.match(V.PADROES.tamanhos) || []).length === 1,
    'DN1 a catraca reconhece um hex, um .white e um tamanho fixo');
  ok(!('.whitespacesAndNewlines'.match(V.PADROES.pretoBranco)),
    'DN2 .whitespacesAndNewlines não conta como .white');

  const r = V.verificar();
  ok(r.falhas.length === 0,
    'DN3 nenhum hex, .white/.black, .system(size:) ou emoji novo fora da base visual (Mac e iPad)'
    + (r.falhas.length ? ' — ' + r.falhas.join('; ') : ''));

  if (process.platform !== 'darwin') {
    ok(true, 'DN4 testes Swift da base visual — pulados fora do macOS (no Mac: bash scripts/testar-design-nativo.sh)');
    return;
  }
  let saida = '', passou = true;
  try {
    saida = execFileSync('bash', [path.join(RAIZ, 'scripts', 'testar-design-nativo.sh')], { encoding: 'utf8' });
  } catch (e) {
    passou = false;
    saida = String(e.stdout || '') + String(e.stderr || '');
  }
  ok(passou, 'DN4 testes Swift da base visual (cor, contraste, fontes, escala) passam'
    + (passou ? '' : ' — ' + saida.split('\n').filter((l) => l.startsWith('✗') || /error:/.test(l)).join('; ').slice(0, 400)));
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const falhas = [];
  await testarDesignNativo((c, l) => { console.log((c ? '✓ ' : '✗ ') + l); if (!c) falhas.push(l); });
  process.exit(falhas.length ? 1 : 0);
}
