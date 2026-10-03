/* Avisos como fato oficial em campo oficial — decisão da dona (03/10/2026). As Notas do Cátedra
   saíram do acervo (tests/sem-anotacoes.mjs); o que elas avisavam voltou sem comentário nosso:
   · (a) decisões × acervo: docs/avisos-oficiais/avisos-2026-10.json está aplicado no
         juris-index.js, no juris-text.js, nas fatias que o app lê e nos lotes das teses oficiais —
         a Situação, o trecho literal em "Informações da fonte", a citação de origem e a marca
         [sic] no erro que é da própria fonte. O aplicador é idempotente (nada a aplicar);
   · (a') classificação: os quatro verbetes que estavam rotulados como o que não são ("Recursos
         repetitivos" num julgado da Corte Especial fora do rito; tese do STJ posta como do STF)
         trazem tribunal, título, tema, órgão e citação da fonte;
   · (b) régua: a marca não corrige o texto (o trecho errado continua lá, literal), não se repete,
         e nenhuma decisão reintroduz nota da plataforma;
   · (c) nativo, onde existir: o corpus.json traz a mesma Situação e o mesmo [sic];
   · (d) navegador: o verbete superado abre com a Situação PINTADA no cabeçalho (caixa e contraste
         medidos); o erro da fonte aparece com [sic] no enunciado; o trecho literal da ficha aparece
         em "Informações da fonte". */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { comSic, comOb, marca } from '../scripts/aplicar-avisos-oficiais.mjs';
import { limpaCampo } from '../scripts/limpar-anotacoes-juris.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const carrega = (f, g) => { const e = {}; new Function('window', fs.readFileSync(path.join(RAIZ, f), 'utf8')).call(null, e); return e[g]; };
const D = JSON.parse(fs.readFileSync(path.join(RAIZ, 'docs/avisos-oficiais/avisos-2026-10.json'), 'utf8'));
const mostra = (a) => a.length ? ' (' + a.length + ': ' + a.slice(0, 3).join(', ') + ')' : '';

export function testarAvisosOficiaisEstatico(ok, opcoes = {}) {
  const R = 'AVISOS OFICIAIS [' + (opcoes.motor || 'node') + '] ';
  const IDX = Object.fromEntries(carrega('juris-index.js', '__JURIS_IDX__').map(r => [r[0], r]));
  const TXT = carrega('juris-text.js', '__JURIS_TXT__');

  // (a) decisões × acervo
  const nS = Object.keys(D.situacao).length, nO = Object.keys(D.ob).length;
  ok(nS >= 25 && nO >= 15 && D.sic.length >= 11, R + '(a) o arquivo de decisões foi lido (' + nS + ' situações, ' + nO + ' trechos literais, ' + D.sic.length + ' marcas)');
  const sitRuim = Object.entries(D.situacao).filter(([id, s]) => !IDX[id] || IDX[id][8] !== s).map(x => x[0]);
  ok(sitRuim.length === 0, R + '(a) toda Situação decidida está na coluna de situação do índice' + mostra(sitRuim));
  const obRuim = Object.entries(D.ob).filter(([id, t]) => !TXT[id] || !(TXT[id].ob || '').includes(t)).map(x => x[0]);
  ok(obRuim.length === 0, R + '(a) todo trecho literal está nas "Informações da fonte" do verbete' + mostra(obRuim));
  const fpRuim = Object.entries(D.fp).filter(([id, t]) => !TXT[id] || TXT[id].fp !== t).map(x => x[0]);
  ok(fpRuim.length === 0, R + '(a) a citação de origem decidida está no verbete' + mostra(fpRuim));
  const sicRuim = D.sic.filter(([id, campo, trecho]) => !TXT[id] || !(TXT[id][campo] || '').includes(trecho + marca(campo))).map(x => x[0]);
  ok(sicRuim.length === 0, R + '(a) todo erro da fonte está no verbete como publicado, seguido da marca' + mostra(sicRuim));
  const C = D.classificacao || {};
  const clsRuim = Object.entries(C).filter(([id, c]) => !IDX[id] || !TXT[id]
    || Object.entries(c.indice || {}).some(([col, v]) => IDX[id][+col] !== v)
    || Object.entries(c.texto || {}).some(([campo, v]) => (TXT[id][campo] === undefined ? null : TXT[id][campo]) !== v)).map(x => x[0]);
  ok(Object.keys(C).length >= 4 && clsRuim.length === 0, R + '(a) os ' + Object.keys(C).length + ' verbetes mal classificados trazem tribunal, título, tema, órgão e citação da fonte' + mostra(clsRuim));
  // só os decididos: o mesmo rótulo é legítimo no vizinho que É repetitivo (SELTJPR-0225, Tema 1309)
  const rotulo = Object.keys(C).filter(id => /^recursos repetitivos\s*:/i.test(String(IDX[id][4] || '')) || /^recursos repetitivos\s*:/i.test(String(IDX[id][6] || '')));
  const rotuloEn = Object.keys(C).filter(id => /^RECURSOS REPETITIVOS:/i.test(TXT[id].en || ''));
  ok(rotulo.length === 0 && rotuloEn.length === 0, R + '(a) o julgado da Corte Especial fora do rito não abre mais título, tema nem enunciado com "Recursos repetitivos:"' + mostra(rotulo.concat(rotuloEn)));
  ok(IDX['SELTJPR-0313'][1] === 'STJ' && !TXT['SELTJPR-0313'].ob && /Primeira Seção/.test(TXT['SELTJPR-0313'].og || ''),
    R + '(a) o Tema Repetitivo 1304 é do STJ (Primeira Seção) e não carrega a observação de outro julgado');
  // as fatias são o que o app de fato lê
  const dirF = path.join(RAIZ, 'dados', 'juris-text'); const F = {};
  for (const f of fs.readdirSync(dirF)) if (/^\d+-[0-9a-f]+\.json$/.test(f)) Object.assign(F, JSON.parse(fs.readFileSync(path.join(dirF, f), 'utf8')));
  const tocados = [...new Set([...Object.keys(D.ob), ...Object.keys(D.fp), ...D.sic.map(x => x[0]), ...Object.keys(D.classificacao || {})])];
  const fatiaRuim = tocados.filter(id => JSON.stringify(F[id]) !== JSON.stringify(TXT[id]));
  ok(tocados.length > 20 && fatiaRuim.length === 0, R + '(a) as fatias de dados/juris-text trazem os ' + tocados.length + ' verbetes tocados iguais ao juris-text.js' + mostra(fatiaRuim));
  let saida = '', codigo = 0;
  try { saida = execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'aplicar-avisos-oficiais.mjs'), '--conferir'], { cwd: RAIZ, encoding: 'utf8' }); }
  catch (e) { codigo = e.status || 1; saida = String(e.stdout || '') + String(e.stderr || ''); }
  ok(codigo === 0 && /^0 campo/.test(saida), R + '(a) o aplicador não tem nada a aplicar: decisões, lotes e acervo estão em dia (' + saida.trim().slice(0, 80) + ')');

  // (b) régua
  ok(comSic('A Lei 9.969/1998 não prevê', 'Lei 9.969/1998', 'en') === 'A Lei 9.969/1998 [sic] não prevê'
    && comSic('A Lei 9.969/1998 [sic] não prevê', 'Lei 9.969/1998', 'en') === 'A Lei 9.969/1998 [sic] não prevê'
    && comSic('[X, j. 24-5-2002, P]', 'j. 24-5-2002', 'fp') === '[X, j. 24-5-2002 (sic), P]' && comSic('outro texto', 'Lei 9.969/1998', 'en') === null,
    R + '(b) a marca entra depois do trecho, sem corrigi-lo e sem se repetir; dentro de citação entre colchetes vira (sic); trecho ausente acusa');
  ok(comOb(undefined, 'x') === 'x' && comOb('a', 'x') === 'a\nx' && comOb('a\nx', 'x') === 'a\nx', R + '(b) o trecho literal é acrescentado uma vez só');
  const comNota = [...Object.entries(D.ob), ...Object.entries(D.situacao), ...Object.entries(D.fp)].filter(([id, t]) => /Nota do C|[Cc]onfira|ATENÇÃO|[Cc]uidado:/.test(t) || limpaCampo(id, 'ob', t) !== t).map(x => x[0]);
  ok(comNota.length === 0, R + '(b) nenhuma decisão traz nota, conselho ou alerta escrito pela plataforma' + mostra(comNota));
  const aspas = Object.entries(D.ob).filter(([, t]) => !/"[^"]{40,}"/.test(t)).map(x => x[0]);
  ok(aspas.length === 0, R + '(b) todo trecho acrescentado é citação entre aspas, com a origem' + mostra(aspas));

  // (c) nativo
  const corpora = [['VadeMecumJuris (origem)', path.join(process.env.HOME || '', 'App Jurisprudências', 'VadeMecumJuris', 'Sources', 'VadeMecum', 'Resources')]];
  const macBuild = path.join(RAIZ, 'mac', 'build');
  if (fs.existsSync(macBuild)) for (const n of fs.readdirSync(macBuild)) if (n.endsWith('.app')) corpora.push(['mac/build/' + n, path.join(macBuild, n, 'Contents', 'Resources')]);
  for (const [rotulo, dir] of corpora) {
    const f = path.join(dir, 'corpus.json');
    if (!fs.existsSync(f)) { console.log('  · ' + R + rotulo + '/corpus.json não existe nesta máquina — fica de fora'); continue; }
    const nat = Object.fromEntries(JSON.parse(fs.readFileSync(f, 'utf8')).map(r => [r.id, r]));
    const s = Object.entries(D.situacao).filter(([id, v]) => nat[id] && nat[id].situacao !== v).map(x => x[0]);
    const o = Object.entries(D.ob).filter(([id, t]) => nat[id] && !(nat[id].observacao || '').includes(t)).map(x => x[0]);
    const c = D.sic.filter(([id, , trecho]) => nat[id] && JSON.stringify(nat[id]).includes(JSON.stringify(trecho).slice(1, -1)) && !/\[sic\]|\(sic\)/.test(JSON.stringify(nat[id]))).map(x => x[0]);
    const k = Object.entries(D.classificacao || {}).filter(([id, cl]) => nat[id] && ((cl.indice[1] && nat[id].tribunal !== cl.indice[1]) || (cl.indice[4] && nat[id].titulo !== cl.indice[4])
      || ('ob' in (cl.texto || {}) && (nat[id].observacao || null) !== cl.texto.ob) || (cl.texto.en && nat[id].enunciado !== cl.texto.en))).map(x => x[0]);
    ok(s.length + o.length + c.length + k.length === 0, R + '(c) ' + rotulo + ': Situação, trecho literal, [sic] e classificação iguais aos da web' + mostra(s.concat(o, c, k)));
  }
}

export async function testarAvisosOficiaisNavegador(page, base, ok, opcoes = {}) {
  const R = 'AVISOS OFICIAIS [' + (opcoes.motor || '?') + '] [' + (opcoes.origem || '?') + '] ';
  const abrir = async (id) => {
    await page.evaluate((i) => window.jurisAbrirPorId(i), id);
    await page.waitForFunction((i) => window.jurisVerbeteAberto() === i && !!document.querySelector('#jrDoc .venun .bd .gr'), id, { timeout: 20000 });
  };
  await page.goto(base + '/juris-web.html');
  await page.waitForFunction(() => typeof window.jurisAbrirPorId === 'function' && window.jurisTemId('x') !== null, null, { timeout: 20000 });

  await abrir('CTRLCONST-0105');
  const sit = await page.evaluate(() => {
    const lum = (c) => { const m = String(c).match(/[\d.]+/g).map(Number); if (/^color\(/.test(String(c))) { m[0] *= 255; m[1] *= 255; m[2] *= 255; } const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return { l: 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]), a: m.length > 3 ? m[3] : 1 }; };
    const fundo = (e0) => { for (let e = e0; e; e = e.parentElement) { const g = getComputedStyle(e).backgroundColor; if (lum(g).a >= 0.99) return g; } return 'rgb(255,255,255)'; };
    const el = [...document.querySelectorAll('#jrDoc .vhero .meta')].find(e => /Superado/.test(e.textContent));
    if (!el) return null;
    const cx = el.getBoundingClientRect(), cs = getComputedStyle(el), a = lum(cs.color).l, g = lum(fundo(el)).l;
    return { texto: el.textContent.trim(), largura: Math.round(cx.width), altura: Math.round(cx.height), visivel: cs.display !== 'none' && cs.visibility !== 'hidden', contraste: +((Math.max(a, g) + 0.05) / (Math.min(a, g) + 0.05)).toFixed(2) };
  });
  ok(!!sit && sit.visivel && sit.largura > 30 && sit.altura >= 10 && sit.contraste >= 4.5,
    R + '(d) CTRLCONST-0105 abre com a Situação PINTADA no cabeçalho: ' + (sit ? '"' + sit.texto + '", ' + sit.largura + '×' + sit.altura + ' px, contraste ' + sit.contraste + ':1' : 'ausente'));

  await abrir('repgeral-repetitivo-STJ-1149');
  const en = await page.evaluate(() => document.querySelector('#jrDoc .venun .bd').textContent);
  ok(/Lei 9\.969\/1998 \[sic\]/.test(en) && !/9\.696/.test(en), R + '(d) o Tema 1149 mostra o texto como o STJ publicou, com [sic], sem corrigi-lo');

  await abrir('repgeral-repetitivo-STJ-988');
  const inf = await page.evaluate(() => { const b = [...document.querySelectorAll('#jrDoc .vblk')].find(x => x.querySelector('.lbl').textContent.trim() === 'Informações da fonte');
    if (!b) return null; const bd = b.querySelector('.bd'), cx = bd.getBoundingClientRect(); return { texto: bd.textContent, altura: Math.round(cx.height), largura: Math.round(cx.width) }; });
  ok(!!inf && inf.texto.includes(D.ob['repgeral-repetitivo-STJ-988']) && inf.altura >= 16 && inf.largura > 200,
    R + '(d) o Tema 988 mostra a modulação, literal, em "Informações da fonte" (' + (inf ? inf.largura + '×' + inf.altura + ' px' : 'bloco ausente') + ')');
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const falhas = [];
  testarAvisosOficiaisEstatico((c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) falhas.push(m); });
  if (falhas.length) { console.error('\n' + falhas.length + ' falha(s).'); process.exit(1); }
}
