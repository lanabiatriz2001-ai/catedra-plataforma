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

/* No código-fonte, CSS, paletas e comportamento continuam separados e testáveis. No
   artefato, entram no próprio <head>: pedir três arquivos antes da primeira pintura
   anulava boa parte do benefício da casca em rede lenta. */
export function embutirAbertura(html) {
  const css = readFileSync(new URL('carregamento-inicial.css', raiz), 'utf8');
  const paletas = readFileSync(new URL('abertura-temas.js', raiz), 'utf8');
  const comportamento = readFileSync(new URL('carregamento-inicial.js', raiz), 'utf8');
  const bloco = '<style data-ct-abertura>' + css.replace(/<\/style/gi, '<\\/style') + '</style>\n'
    + '<script data-ct-abertura="temas">' + paletas.replace(/<\/script/gi, '<\\/script') + '</script>\n'
    + '<script data-ct-abertura="comportamento">window.CT_CSS_ESPERADO=true;\n' + comportamento.replace(/<\/script/gi, '<\\/script') + '</script>';
  const externo = '<link rel="stylesheet" href="./carregamento-inicial.css">\n'
    + '<script src="./abertura-temas.js"></script>\n'
    + '<script src="./carregamento-inicial.js"></script>';
  if (!html.includes(externo)) throw new Error('Bloco externo da abertura não encontrado no host.');
  return html.replace(externo, bloco);
}

export function linkEstiloNaoBloqueante(href, sinalPronto) {
  const aoCarregar = "this.onload=null;this.media='all';"
    + (sinalPronto ? "window." + sinalPronto + "=true;window.dispatchEvent(new Event('ct-css-pronto'))" : '');
  const aoFalhar = sinalPronto ? "window.dispatchEvent(new Event('ct-css-falhou'))" : '';
  return '<link rel="stylesheet" href="' + href + '" media="print" onload="' + aoCarregar + '" onerror="' + aoFalhar + '">'
    + '<noscript><link rel="stylesheet" href="' + href + '"></noscript>';
}

export function prepararAbertura(html) {
  const embutido = embutirAbertura(html);
  const fim = embutido.indexOf('</head>');
  if (fim < 0) throw new Error('O host não tem </head> para ordenar a abertura.');
  const css = '<link rel="stylesheet" href="./catedra-ui.css">';
  const cssAssincrono = linkEstiloNaoBloqueante('./catedra-ui.css', 'CT_CSS_PRONTO');
  if (!embutido.includes(css)) throw new Error('Folha visual compartilhada não encontrada no host.');
  const head = embutido.slice(0, fim)
    .replace(css, cssAssincrono)
    .replace(/<script\b(?![^>]*\b(?:defer|async)\b)([^>]*\bsrc="[^"]+"[^>]*)>/g, '<script defer$1>');
  return head + embutido.slice(fim);
}
