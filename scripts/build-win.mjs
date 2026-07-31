// Bundle local do app WINDOWS (win/app/web) — mesma arquitetura do app nativo
// do macOS: o Electron carrega index.html de DENTRO do app (nada de abrir o
// site). Reusa o bundle do build-macos.mjs (react/supabase/auth vendorados +
// legis-web/juris-web/dados JURIS) e aplica dois ajustes que no Mac são feitos
// pelo host Swift:
//   1. IA: injeta window.claude.complete apontando para a função serverless do
//      deploy (URL ABSOLUTA — o bundle roda em file://).
//   2. Leitor de lei (legis-web): /api/law relativo → URL absoluta do deploy.
import { execSync } from 'node:child_process';
import { cpSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'mac', 'build', 'web');
const OUT = join(ROOT, 'win', 'app', 'web');
const DEPLOY = 'https://catedra-plataforma.vercel.app';

// 1. gera (ou regenera) o bundle base
execSync('node scripts/build-macos.mjs', { cwd: ROOT, stdio: 'inherit' });

// 2. copia para dentro do app Windows
rmSync(OUT, { recursive: true, force: true });
cpSync(SRC, OUT, { recursive: true });

// 3. shim de IA (mesmo do build.mjs, com URL absoluta)
const idx = join(OUT, 'index.html');
let html = readFileSync(idx, 'utf8');
const SHIM = `
<script>
/* Windows: IA via função serverless do deploy (chave fica no servidor). */
window.claude = {
  complete: async function (prompt) {
    const r = await fetch('${DEPLOY}/api/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt })
    });
    if (!r.ok) throw new Error('IA HTTP ' + r.status);
    const j = await r.json();
    return j.completion || j.text || '';
  }
};
</script>`;
html = html.replace('<head>', '<head>' + SHIM);
writeFileSync(idx, html);

// 4. leitor de lei com proxy absoluto
const lw = join(OUT, 'legis-web.html');
if (existsSync(lw)) {
  writeFileSync(lw, readFileSync(lw, 'utf8').replaceAll("'/api/law?u=", `'${DEPLOY}/api/law?u=`));
}

console.log('✓ bundle Windows → win/app/web (local, com IA e leitor via deploy)');
