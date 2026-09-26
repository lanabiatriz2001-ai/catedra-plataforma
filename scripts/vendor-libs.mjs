// scripts/vendor-libs.mjs — React, ReactDOM e supabase-js vêm do REPOSITÓRIO (vendor/), não da rede.
//
// Antes, scripts/build.mjs e scripts/build-macos.mjs baixavam as três bibliotecas do jsdelivr
// a cada build, sem checksum (só um tamanho mínimo), e o supabase-js vinha por
// `@supabase/supabase-js@2`, que FLUTUA: a mesma linha de build dava 2.117.1 num dia e 2.117.2
// no outro. Uma versão nova pode trazer sintaxe que o JavaScriptCore do WKWebView não aceita,
// e aí o login quebra em silêncio no Mac e no iPad. O Xcode Cloud baixava do mesmo jeito.
//
// Agora os arquivos moram em vendor/, com o sha256 de cada um em vendor/manifesto.json. Os dois
// builds chamam lerVendor(): cada arquivo pedido tem de existir, constar do manifesto e bater o
// hash. Qualquer desvio ABORTA o build nomeando o arquivo — nunca cai para a rede nem para o CDN.
// Trocar versão é decisão da dona, pelo scripts/atualizar-vendor.mjs.

import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

export const VENDOR_DIR = 'vendor';
export const MANIFESTO = 'vendor/manifesto.json';
// Ordem de carga: React antes de ReactDOM (que usa o global React), ambos antes do support.js.
export const LIBS = ['react.js', 'react-dom.js', 'supabase.js'];

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function abortar(linhas) {
  console.error('\n✗ BUILD ABORTADO: ' + linhas[0]);
  for (const l of linhas.slice(1)) console.error('  ' + l);
  console.error('\n  As bibliotecas são versionadas em vendor/ e conferidas pelo sha256 de');
  console.error('  vendor/manifesto.json. Restaure com `git checkout -- vendor/`. Trocar de versão');
  console.error('  é decisão da dona: node scripts/atualizar-vendor.mjs (ver o cabeçalho).\n');
  process.exit(1);
}

/* Devolve [{ arquivo, pacote, versao, conteudo }] na ordem de LIBS, já conferidos.
   Não escreve nada: quem chama decide para onde copiar. */
export function lerVendor(ROOT, libs = LIBS) {
  const pManifesto = join(ROOT, MANIFESTO);
  if (!existsSync(pManifesto)) abortar([MANIFESTO + ' não existe — sem ele não há hash para conferir.']);
  let manifesto;
  try { manifesto = JSON.parse(readFileSync(pManifesto, 'utf8')); }
  catch (e) { abortar([MANIFESTO + ' ilegível: ' + e.message]); }
  const porNome = new Map((manifesto.arquivos || []).map((a) => [a.arquivo, a]));
  const saida = [];
  for (const arquivo of libs) {
    const rel = VENDOR_DIR + '/' + arquivo;
    const ent = porNome.get(arquivo);
    if (!ent || !/^[0-9a-f]{64}$/.test(ent.sha256 || '')) abortar([rel + ' não consta do ' + MANIFESTO + ' (ou está sem sha256).']);
    const p = join(ROOT, VENDOR_DIR, arquivo);
    if (!existsSync(p)) abortar([rel + ' não existe no repositório.', 'esperado: ' + ent.pacote + '@' + ent.versao]);
    const conteudo = readFileSync(p);
    const h = sha256(conteudo);
    if (h !== ent.sha256) {
      abortar([rel + ' não bate com o sha256 do manifesto (arquivo alterado ou corrompido).',
        'esperado: ' + ent.sha256 + '  (' + ent.pacote + '@' + ent.versao + ', ' + ent.bytes + ' bytes)',
        'obtido:   ' + h + '  (' + conteudo.length + ' bytes)']);
    }
    saida.push({ arquivo, pacote: ent.pacote, versao: ent.versao, conteudo });
  }
  return saida;
}
