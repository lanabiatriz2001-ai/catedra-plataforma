/* WIDGETS — o recorte da "lei/súmula do dia" que vai dentro do widget (widget/dodia.json, gerado por
   scripts/build-widget-dodia.mjs). Artigos pelo que caiu em prova (espelhos oficiais de 2ª fase); súmulas por
   julgados que as citam, rotuladas assim (não há dado de súmula em prova — decisão da dona, 01/10/2026).
   Roda sozinho: node tests/widget-dodia.mjs */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FORA = new Set(['Cancelada', 'Superada', 'Revogada', 'Publicação suspensa']);

export async function testarWidgetDodia(ok) {
  const R = 'WIDGET DO DIA ';
  const arq = path.join(RAIZ, 'widget', 'dodia.json');
  ok(fs.existsSync(arq), R + 'widget/dodia.json existe');
  if (!fs.existsSync(arq)) return;
  const chk = spawnSync(process.execPath, [path.join(RAIZ, 'scripts', 'build-widget-dodia.mjs'), '--checar'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  ok(chk.status === 0, R + 'o arquivo está em dia com as fontes (' + ((chk.stdout || '') + (chk.stderr || '')).trim().split('\n').pop() + ')');
  const txt = fs.readFileSync(arq, 'utf8');
  const d = JSON.parse(txt);
  const kb = Math.round(Buffer.byteLength(txt) / 1024);
  ok(Buffer.byteLength(txt) <= 400 * 1024, R + 'cabe no teto de 400 KB (' + kb + ' KB)');
  const art = d.itens.filter(i => i.tipo === 'artigo'), sum = d.itens.filter(i => i.tipo === 'sumula');
  ok(art.length >= 250 && art.length <= 300, R + 'entre 250 e 300 artigos (' + art.length + ')');
  ok(sum.length >= 100 && sum.length <= 150, R + 'entre 100 e 150 súmulas (' + sum.length + ')');
  ok(art.every(a => /^caiu em \d+ provas?$/.test(a.rotulo) && Array.isArray(a.provas) && a.provas.length >= 1 && a.n >= 1 && a.artigo),
    R + 'todo artigo diz em quantas provas caiu e lista as provas');
  ok(sum.every(s => /^citada em \d+ julgados?$/.test(s.rotulo) && !s.provas), R + 'toda súmula diz "citada em N julgados" e não finge prova');
  ok(art.every((a, i, arr) => i === 0 || arr[i - 1].n >= a.n), R + 'artigos em ordem de incidência em prova');
  ok(sum.every((s, i, arr) => i === 0 || arr[i - 1].n >= s.n), R + 'súmulas em ordem de citação');
  ok(d.itens.slice(0, 9).map(i => i.tipo[0]).join('') === 'aasaasaas', R + 'ordem fixa: dois artigos, uma súmula (' + d.itens.slice(0, 9).map(i => i.tipo[0]).join('') + ')');
  ok(d.itens.every(i => i.texto && i.texto.length <= 501 && /^#[0-9a-f]{6}$/.test(i.cor) && /^#[0-9a-f]{6}$/.test(i.corD)), R + 'todo item tem texto ≤ 500 caracteres e cores em hex');
  ok(!art.some(a => /^Art\.?\s*\d/i.test(a.texto)), R + 'o texto não repete o "Art. N" que já está no título');
  const cf5 = art.find(a => a.diploma === 'Constituição Federal' && a.artigo === '5');
  ok(!!cf5 && cf5.titulo === 'Art. 5º' && /Todos são iguais perante a lei/.test(cf5.texto), R + 'o art. 5º da CF traz o caput e o título com ordinal');
  const s7 = sum.find(s => s.id === 'STJ-SUM-7');
  ok(!!s7 && s7.titulo === 'Súmula 7 do STJ' && /reexame de prova/i.test(s7.texto), R + 'a Súmula 7 do STJ traz o enunciado certo');
  globalThis.window = globalThis.window || {};
  new Function('window', fs.readFileSync(path.join(RAIZ, 'juris-index.js'), 'utf8'))(globalThis.window);
  const idx = new Map((globalThis.window.__JURIS_IDX__ || []).map(r => [r[0], r]));
  ok(!sum.some(s => idx.has(s.id) && FORA.has(idx.get(s.id)[8])), R + 'nenhuma súmula cancelada, superada ou revogada');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const falhas = [];
  await testarWidgetDodia((c, l) => { console.log((c ? '✓ ' : '✗ ') + l); if (!c) falhas.push(l); });
  process.exit(falhas.length ? 1 : 0);
}
