/* CORREÇÕES LOCAIS DO support.js (25/09/2026)

   O support.js nasceu gerado de dc-runtime/src/*.ts, mas o dc-runtime não está no
   repositório: o arquivo passou a ser mantido à mão, e três correções foram feitas direto
   nele. Se alguém regerar o runtime a partir de um dc-runtime de fora, elas somem em
   silêncio — a do PR #123 só se nota no iPad, com os menus de escolha vazios, porque o
   Chromium e o WebKit do Playwright não mutilam o <sc-for> dentro de <select>.

   O que se prova, estático e sem navegador (roda também na CI):
   · SUP1 a releitura do template em boot() aceita a resposta de file:// (status 0) —
     b29e05f, PR #123;
   · SUP2 o EVENT_MAP tem os quatro eventos de arrastar e soltar — 4d5e8c9;
   · SUP3 o aviso __dc_booted ao pai não vai para "*" em http(s) — 7b7e8dd, PR #136;
   · SUP4 o cabeçalho não diz mais "do not edit" e lista as correções locais;
   · SUP5 nenhum Babel buscado de fora (unpkg) — PR #166;
   · controle: cada correção desfeita em memória REPROVA na mesma régua (a régua não é
     frouxa a ponto de aprovar o arquivo antigo).

   Roda sozinho: node tests/support-correcoes-locais.mjs [caminho/para/support.js]
   (sem caminho, confere o support.js da raiz; com caminho, confere a cópia indicada — é
   assim que se prova a régua contra `git show b29e05f^:support.js`). */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AVISO = ' — uma regeneração do support.js a partir do dc-runtime (que não está no repositório) '
  + 'apagou a correção local; reaplique-a (veja `git show COMMIT -- support.js` e o cabeçalho do arquivo)';

// Trecho entre `abre` e o fechamento que casa com ele (conta chaves/parênteses; o suficiente
// para o código gerado pelo bundler, que não põe chave solta em string nesses trechos).
function bloco(src, inicio) {
  const i = src.indexOf('{', inicio);
  if (i < 0) return '';
  let n = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') n++;
    else if (src[j] === '}' && --n === 0) return src.slice(i, j + 1);
  }
  return '';
}

// Devolve { SUP1: [...], SUP2: [...], SUP3: [...], SUP4: [...] } com os problemas de cada régua.
export function problemasDoSupport(bruto) {
  const p = { SUP1: [], SUP2: [], SUP3: [], SUP4: [], SUP5: [] };
  // As réguas de código olham só o código: linha de comentário sai (o próprio cabeçalho cita
  // `fetch(location.href)` e `res.ok || res.status === 0`, e não pode contar como correção).
  const src = bruto.replace(/^[ \t]*\/\/.*$/gm, '');

  // SUP1 — o fetch(location.href) do boot e o primeiro .then() dele.
  const f = src.indexOf('fetch(location.href)');
  if (f < 0) p.SUP1.push('a releitura do template (fetch(location.href) em boot()) sumiu');
  else {
    const resto = src.slice(f + 'fetch(location.href)'.length);
    const m = resto.match(/^\s*\.then\(\s*\(?\s*(\w+)\s*\)?\s*=>([\s\S]*?)\)\s*\.then\(/);
    if (!m) p.SUP1.push('o fetch(location.href) não é seguido do .then() que lê o texto');
    else {
      const r = m[1], corpo = m[2];
      const esc = r.replace(/[$]/g, '\\$');
      const leTexto = new RegExp('\\b' + esc + '\\.text\\(\\)').test(corpo);
      const olhaOk = new RegExp('\\b' + esc + '\\.ok\\b').test(corpo);
      const aceitaZero = new RegExp('\\b' + esc + '\\.status\\s*===?\\s*0\\b|\\b0\\s*===?\\s*' + esc + '\\.status\\b|!\\s*' + esc + '\\.status\\b').test(corpo)
        || /protocol\s*===?\s*["']file:["']/.test(corpo);
      if (!leTexto) p.SUP1.push('o .then() da releitura não lê ' + r + '.text()');
      else if (olhaOk && !aceitaZero) p.SUP1.push('a releitura exige ' + r + '.ok e descarta a resposta de file:// (ok=false, status=0): "' + corpo.trim().slice(0, 90) + '"');
    }
  }

  // SUP2 — os quatro eventos de arraste no EVENT_MAP.
  const e = src.search(/\bEVENT_MAP\s*=/);
  if (e < 0) p.SUP2.push('não achei o EVENT_MAP');
  else {
    const mapa = bloco(src, e);
    for (const [attr, prop] of [['ondragover', 'onDragOver'], ['ondragenter', 'onDragEnter'], ['ondragleave', 'onDragLeave'], ['ondrop', 'onDrop']]) {
      if (!new RegExp('\\b' + attr + '\\s*:\\s*["\']' + prop + '["\']').test(mapa)) p.SUP2.push('o EVENT_MAP não mapeia ' + attr + ' → ' + prop);
    }
  }

  // SUP3 — o destino do postMessage do __dc_booted.
  const b = src.indexOf('"__dc_booted"');
  if (b < 0) p.SUP3.push('não achei o aviso __dc_booted');
  else {
    const ini = src.lastIndexOf('postMessage(', b);
    const obj = bloco(src, ini);
    const depois = src.slice(src.indexOf(obj, ini) + obj.length);
    const alvo = (depois.match(/^\s*,\s*([^)]+?)\s*\)/) || [])[1];
    const trecho = src.slice(Math.max(0, ini - 600), ini);
    if (!alvo) p.SUP3.push('não achei o segundo argumento do postMessage do __dc_booted');
    else if (/^["']\*["']$/.test(alvo)) p.SUP3.push('o postMessage do __dc_booted voltou a mandar para "*" em qualquer origem');
    else if (!/location\.origin/.test(trecho + alvo)) p.SUP3.push('o destino do __dc_booted (' + alvo + ') não usa location.origin em http(s)');
  }

  // SUP4 — o cabeçalho honesto.
  const cab = bruto.split('\n').slice(0, 40).join('\n');
  if (/do not edit/i.test(cab)) p.SUP4.push('o cabeçalho voltou a dizer "do not edit" — o arquivo é mantido à mão');
  if (!/PR #166/.test(cab)) p.SUP4.push('o cabeçalho não lista a correção local do Babel (PR #166)');
  // SUP5 — nada de Babel buscado na rede (o código ignora comentários).
  if (/unpkg\.com\/@babel|babel\.min\.js|BABEL_URL/.test(src)) p.SUP5.push('o support.js voltou a buscar o Babel standalone no unpkg');
  for (const c of ['b29e05f', '4d5e8c9', '7b7e8dd']) {
    if (!cab.includes(c)) p.SUP4.push('o cabeçalho não lista a correção local ' + c);
  }
  return p;
}

const COMMIT = { SUP1: 'b29e05f', SUP2: '4d5e8c9', SUP3: '7b7e8dd', SUP4: 'b29e05f', SUP5: 'PR #166' };
const NOME = {
  SUP1: 'a releitura do template aceita file:// (status 0) e os menus do Mac e do iPad listam as opções',
  SUP2: 'o EVENT_MAP entrega arrastar e soltar (ondragover/ondragenter/ondragleave/ondrop)',
  SUP3: 'o aviso __dc_booted vai para location.origin em http(s), não para "*"',
  SUP4: 'o cabeçalho diz que o arquivo é mantido à mão e lista as correções locais',
  SUP5: 'o runtime não busca o Babel standalone no unpkg',
};

export async function testarSupportCorrecoesLocais(ok, arquivo = path.join(RAIZ, 'support.js')) {
  const src = fs.readFileSync(arquivo, 'utf8');
  const p = problemasDoSupport(src);
  for (const k of Object.keys(NOME)) {
    ok(p[k].length === 0, k + ' support.js: ' + NOME[k]
      + (p[k].length ? ' — ' + p[k].join('; ') + (k === 'SUP4' ? '' : AVISO.replace('COMMIT', COMMIT[k])) : ''));
  }

  // Controles: cada correção desfeita em memória tem de reprovar. Se a régua aprovar o
  // arquivo desfeito, ela não protege nada (é o furo dos "dois verdes falsos"). Só no
  // support.js da raiz: numa cópia antiga passada pela linha de comando não há o que desfazer.
  if (path.resolve(arquivo) !== path.join(RAIZ, 'support.js')) return;
  const desfeitas = {
    SUP1: src.replace(/res\.ok\s*\|\|\s*res\.status\s*===\s*0\s*\?/, 'res.ok ?'),
    SUP2: src.replace(/,\s*(\/\/[^\n]*\n\s*)*ondragover:[\s\S]*?ondrop:\s*"onDrop"/, ''),
    SUP3: src.replace(/\n\s*const destino = [^\n]*/, '').replace(/(__dc_booted[\s\S]*?\}\s*,\s*)destino(\s*\))/, '$1"*"$2'),
    SUP4: '// GENERATED from dc-runtime/src/*.ts — do not edit. Rebuild with `cd dc-runtime && bun run build`.\n'
      + src.slice(src.indexOf('"use strict";')),
  };
  for (const k of Object.keys(desfeitas)) {
    const mudou = desfeitas[k] !== src;
    ok(mudou && problemasDoSupport(desfeitas[k])[k].length > 0,
      k + ' controle: o support.js com a correção ' + COMMIT[k] + ' desfeita REPROVA na mesma régua'
      + (mudou ? '' : ' (a mutação não achou o trecho — atualize o controle junto com o support.js)'));
  }
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const falhas = [];
  const alvo = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
  await testarSupportCorrecoesLocais((c, l) => { console.log((c ? '✓ ' : '✗ ') + l); if (!c) falhas.push(l); }, alvo);
  process.exit(falhas.length ? 1 : 0);
}
