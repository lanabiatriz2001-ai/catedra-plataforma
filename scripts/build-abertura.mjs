// Recorte das paletas do host: a abertura não mantém uma segunda tabela de cores.
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
const raiz = new URL('../', import.meta.url);
const fonte = readFileSync(new URL('Catedra.dc.html', raiz), 'utf8');
const trecho = fonte.match(/THEMES\(\)\s*\{\s*return\s*(\{[\s\S]*?\n  \});\}/);
if (!trecho) throw new Error('A tabela THEMES do host não foi encontrada para a abertura.');
const temas = vm.runInNewContext('(' + trecho[1] + ')', {}, { timeout: 1000 });
const saida = {};
for (const [nome, tema] of Object.entries(temas)) {
  saida[nome] = { display: tema.display, body: tema.body, radius: tema.radius };
  for (const modo of ['light', 'dark']) {
    const paleta = {};
    for (const k of ['bg', 'surface', 'surface2', 'border', 'ink', 'text2', 'sidebarBg', 'sidebarText', 'accent']) {
      if (!tema[modo]?.[k]) throw new Error('Token de abertura ausente: ' + nome + '/' + modo + '/' + k);
      paleta[k] = tema[modo][k];
    }
    saida[nome][modo] = paleta;
  }
}
writeFileSync(new URL('abertura-temas.js', raiz), '// GERADO por scripts/build-abertura.mjs a partir de THEMES() do host.\nwindow.CT_ABERTURA_TEMAS = ' + JSON.stringify(saida) + ';\n');
console.log('✓ abertura usa as ' + Object.keys(saida).length + ' paletas do host');
