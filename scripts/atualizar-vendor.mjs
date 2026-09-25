#!/usr/bin/env node
// scripts/atualizar-vendor.mjs — troca a versão de UMA biblioteca congelada em vendor/.
//
// TROCAR VERSÃO É DECISÃO DA DONA. Este script é manual: nenhum build, teste ou CI o chama,
// e ele não deve ser rodado "para atualizar" sem pedido explícito. As versões em vendor/ são
// as que estão em produção; uma versão nova do supabase-js pode trazer sintaxe que o
// JavaScriptCore do WKWebView (Mac e iPad) não aceita, e o login quebra em silêncio.
//
// Uso (a versão é EXATA, x.y.z — faixa como "2", "^2" ou "latest" é recusada):
//   node scripts/atualizar-vendor.mjs supabase.js 2.117.2
//   node scripts/atualizar-vendor.mjs react.js 18.3.1
//   node scripts/atualizar-vendor.mjs react-dom.js 18.3.1
//   node scripts/atualizar-vendor.mjs pdfjs 3.11.174    # pdf.min.js e pdf.worker.min.js JUNTOS
//                                                    # (o PDF.js recusa worker de outra versão)
//   node scripts/atualizar-vendor.mjs --conferir     # baixa as versões do manifesto e compara
//                                                    # byte a byte com vendor/ (não grava nada)
//
// O que faz: baixa do jsdelivr a versão pedida pelo MESMO caminho que os builds usavam antes
// do congelamento (o arquivo UMD), grava em vendor/<arquivo> e regrava versão, origem, bytes e
// sha256 em vendor/manifesto.json. Depois disso, antes do commit:
//   · rode as duas suítes (npm test e npm run test:webkit, esta com a origem [bundle]);
//   · React e ReactDOM têm o sha384 (SRI) também no support.js (REACT_SRI / REACT_DOM_SRI):
//     trocou a versão, troque lá junto (o script imprime o sha384 novo);
//   · build e instalação no Mac e no iPad, como toda mudança no app.

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MANIFESTO, VENDOR_DIR, sha256 } from './vendor-libs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// O caminho de cada arquivo no jsdelivr. O do supabase-js é o do pacote (sem caminho de
// arquivo): o jsdelivr serve o campo `jsdelivr` do package.json, que é dist/umd/supabase.js,
// com um comentário de cabeçalho dele — exatamente o arquivo que a produção sempre serviu.
const FONTES = {
  'react.js': { pacote: 'react', url: (v) => `https://cdn.jsdelivr.net/npm/react@${v}/umd/react.production.min.js` },
  'react-dom.js': { pacote: 'react-dom', url: (v) => `https://cdn.jsdelivr.net/npm/react-dom@${v}/umd/react-dom.production.min.js` },
  'supabase.js': { pacote: '@supabase/supabase-js', url: (v) => `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${v}` },
  // PDF.js: o cdnjs é de onde o app o buscava em tempo de execução até ser vendorado (os bytes
  // são idênticos aos de pdfjs-dist/build/ no npm). O worker TEM de ser da mesma versão da lib.
  'pdfjs/pdf.min.js': { pacote: 'pdfjs-dist', url: (v) => `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.min.js` },
  'pdfjs/pdf.worker.min.js': { pacote: 'pdfjs-dist', url: (v) => `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.worker.min.js` },
};
// Arquivos que só trocam juntos: pedir "pdfjs" troca os dois.
const GRUPOS = { pdfjs: ['pdfjs/pdf.min.js', 'pdfjs/pdf.worker.min.js'] };

const pManifesto = join(ROOT, MANIFESTO);
const manifesto = JSON.parse(readFileSync(pManifesto, 'utf8'));
const sair = (msg) => { console.error('✗ ' + msg); process.exit(1); };

async function baixar(arquivo, versao) {
  const f = FONTES[arquivo];
  if (!f) sair('arquivo sem fonte conhecida: ' + arquivo);
  const url = f.url(versao);
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) sair(`${url}: HTTP ${r.status}`);
  // O jsdelivr diz qual versão resolveu; com versão exata tem de ser ela mesma.
  const resolvida = r.headers.get('x-jsd-version');
  if (resolvida && resolvida !== versao) sair(`${url}: o CDN resolveu ${resolvida}, não ${versao}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 1000) sair(`${url}: corpo suspeito (${buf.length} bytes)`);
  // O cdnjs não diz a versão num cabeçalho; o PDF.js a traz no próprio arquivo.
  if (arquivo.startsWith('pdfjs/') && !buf.toString('utf8').includes(`"${versao}"`)) sair(`${url}: o arquivo não declara a versão ${versao}`);
  return { url, buf };
}

const args = process.argv.slice(2);
if (args[0] === '--conferir') {
  let divergentes = 0;
  for (const ent of manifesto.arquivos) {
    const { url, buf } = await baixar(ent.arquivo, ent.versao);
    const local = readFileSync(join(ROOT, VENDOR_DIR, ent.arquivo));
    const igual = Buffer.compare(buf, local) === 0 && sha256(buf) === ent.sha256;
    if (!igual) divergentes++;
    console.log(`${igual ? '✓' : '✗'} ${ent.arquivo}  ${ent.pacote}@${ent.versao}  ${igual ? 'idêntico ao CDN' : 'DIFERE do CDN'}  (${url})`);
  }
  process.exit(divergentes ? 1 : 0);
}

const [pedido, versao] = args;
const arquivos = GRUPOS[pedido] || [pedido];
for (const a of arquivos) if (!FONTES[a]) sair('arquivo desconhecido: ' + pedido + ' (use ' + Object.keys(FONTES).filter((k) => !k.startsWith('pdfjs/')).concat(Object.keys(GRUPOS)).join(', ') + ')');
if (!/^\d+\.\d+\.\d+$/.test(versao || '')) sair('versão tem de ser EXATA (x.y.z), recebi: ' + (versao || '(nada)'));

// Baixa TODOS antes de gravar qualquer um: grupo pela metade (lib nova com worker velho) quebra.
const baixados = [];
for (const arquivo of arquivos) {
  const { url, buf } = await baixar(arquivo, versao);
  if (arquivo === 'supabase.js' && !buf.toString('utf8', 0, 600).includes(`/npm/@supabase/supabase-js@${versao}/dist/umd/supabase.js`)) {
    sair(`${url}: o cabeçalho não aponta para dist/umd/supabase.js da ${versao} — o caminho do UMD mudou; confira antes de congelar.`);
  }
  const ent = manifesto.arquivos.find((a) => a.arquivo === arquivo);
  if (!ent) sair(arquivo + ' não consta de ' + MANIFESTO);
  baixados.push({ arquivo, url, buf, ent });
}
for (const { arquivo, url, buf, ent } of baixados) {
  const antes = `${ent.versao} (${ent.bytes} bytes, ${ent.sha256.slice(0, 12)}…)`;
  writeFileSync(join(ROOT, VENDOR_DIR, arquivo), buf);
  Object.assign(ent, { pacote: FONTES[arquivo].pacote, versao, origem: url, bytes: buf.length, sha256: sha256(buf) });
  console.log(`✓ ${VENDOR_DIR}/${arquivo}: ${antes} → ${versao} (${buf.length} bytes, ${ent.sha256.slice(0, 12)}…)`);
  if (arquivo === 'react.js' || arquivo === 'react-dom.js') {
    console.log('  sha384 para o SRI do support.js: sha384-' + createHash('sha384').update(buf).digest('base64'));
  }
}
writeFileSync(pManifesto, JSON.stringify(manifesto, null, 2) + '\n');
if (GRUPOS.pdfjs === arquivos) console.log('  PDF.js: o caso "versão 3.11.174" de tests/pdfjs-local.mjs muda junto, de propósito.');
console.log('  Agora: npm test, npm run test:webkit (com a origem [bundle]) e build nos dois aparelhos.');
