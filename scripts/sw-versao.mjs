// scripts/sw-versao.mjs — a versão do cache do service worker, tirada do CONTEÚDO do deploy.
//
// Antes o sw.js tinha VERSION = 'catedra-v5' fixo. O cache da casca sobrevivia de um deploy
// ao outro: o aquecimento pulava o que já estava guardado, e offline o app abria com o
// index.html de uma publicação e o acervo de outra. Decisão da dona (25/09/2026): um cache
// por versão, renovado a cada deploy — o custo é rebaixar os ~11 MB do acervo quando algo
// muda; em troca, o offline nunca mistura versões.
//
// A versão é o sha256 de TUDO o que vai para public/ (caminho + bytes de cada arquivo, em
// ordem fixa) mais o texto do próprio sw.js antes de receber a versão. Por quê:
//  · DETERMINÍSTICA — mesmo conteúdo, mesma versão. Não é a hora do build nem o sha do
//    commit: um commit só de documento, ou dois builds seguidos, não obrigam ninguém a
//    rebaixar 11 MB (o build já é byte a byte reprodutível).
//  · COMPLETA — o network-first guarda em cache qualquer GET do domínio, não só as listas
//    do precache. Se a conta olhasse só a casca, um contas-index.js novo ficaria com a
//    cópia velha como fallback offline para sempre.
//  · O sw.js entra pelo texto (com as listas já injetadas): mudar a política do worker
//    também é versão nova.
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';

function arquivos(dir, raiz = dir, fora = new Set()) {
  const out = [];
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, d.name);
    if (d.isDirectory()) out.push(...arquivos(p, raiz, fora));
    else if (d.isFile()) {
      const rel = relative(raiz, p).split(sep).join('/');
      if (!fora.has(rel)) out.push(rel);
    }
  }
  return out;
}

/** Hash curto (12 hex) do deploy em `pubDir`, sem contar o próprio sw.js publicado, mais o
    texto do sw.js ainda sem versão. */
export function versaoDoCache(pubDir, textoSw) {
  const h = createHash('sha256');
  for (const rel of arquivos(pubDir, pubDir, new Set(['sw.js'])).sort()) {
    h.update(rel + '\0');
    h.update(readFileSync(join(pubDir, rel)));
    h.update('\0');
  }
  h.update('sw.js\0' + textoSw);
  return h.digest('hex').slice(0, 12);
}

/** O que o build escreve no lugar do marcador do sw.js. */
export const MARCADOR_VERSAO = '/*__VERSAO__*/';
export const linhaVersao = (v) => "VERSION = 'catedra-" + v + "';";
