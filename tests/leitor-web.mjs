/* ENTREGA 7 — LEGIS e JURIS WEB na linguagem do nativo (25/09/2026)

   Prova, nos satélites legis-web.html e juris-web.html:
   · JURIS: o cartão de verbete não tem faixa lateral colorida (DESIGN.md) e "Todos" abre
     pela ORDEM DE AUTORIDADE (súmula vinculante primeiro) — antes abria no TJRO;
   · LEGIS e JURIS: cabeçalho sem emoji como ícone;
   · LEGIS: no leitor, o artigo com jurisprudência mostra o NÚMERO de julgados e, ao toque,
     abre a gaveta com os julgados (fonte: incidencia-verbetes.js, o mesmo índice do nativo)
     e "Abrir no JURIS".

   O texto da lei vem de um fetch de mentira (como tests/legis-guiado.mjs).
   Roda sozinho: node tests/leitor-web.mjs  (Chromium do sistema, via file://). */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EMOJI = /\p{Extended_Pictographic}/u;
const PARAS = [
  'Art. 1º A República Federativa do Brasil, formada pela união indissolúvel dos Estados e Municípios e do Distrito Federal, constitui-se em Estado Democrático de Direito e tem como fundamentos:',
  'I - a soberania;',
  'Art. 2º São Poderes da União, independentes e harmônicos entre si, o Legislativo, o Executivo e o Judiciário.',
];

export async function testarLeitorWeb(page, base, ok) {
  const R = 'LEITOR WEB ';
  // ── JURIS ──
  await page.goto(base + '/juris-web.html');
  await page.waitForFunction(() => document.querySelectorAll('.vcard').length > 0, null, { timeout: 30000 });
  const j = await page.evaluate((re) => {
    const c = document.querySelector('.vcard');
    const be = getComputedStyle(c, '::before');
    const cab = document.querySelector('.head');
    return {
      faixa: be.content !== 'none' && be.content !== 'normal' && parseFloat(be.width) > 0 && parseFloat(be.width) <= 6,
      primeira: c.textContent.replace(/\s+/g, ' ').slice(0, 120),
      emoji: new RegExp(re, 'u').test(cab ? cab.textContent : ''),
    };
  }, EMOJI.source);
  ok(!j.faixa, R + 'JURIS: o cartão de verbete não tem faixa lateral colorida');
  ok(/Súmula Vinculante/.test(j.primeira) && !/TJRO/.test(j.primeira),
    R + 'JURIS: "Todos" abre pela súmula vinculante (ordem de autoridade), não pelo TJRO — veio: ' + j.primeira.slice(0, 60));
  ok(!j.emoji, R + 'JURIS: cabeçalho sem emoji como ícone');

  // Recebendo um id exato, o JURIS abre AQUELE verbete (não busca pelo texto).
  const ID = 'INF2026-STJ-895-12';
  await page.goto(base + '/juris-web.html?q=' + encodeURIComponent(ID));
  const abriu = await page.waitForFunction((id) => {
    const r = document.getElementById('jrdr');
    return r && r.classList.contains('on') && window.jurisVerbeteAberto && window.jurisVerbeteAberto() === id;
  }, ID, { timeout: 15000 }).then(() => true, () => false);
  ok(abriu, R + 'JURIS: um id exato recebido do LEGIS abre direto aquele verbete');

  // ── LEGIS ──
  await page.goto(base + '/legis-web.html?area=juridica');
  await page.waitForFunction(() => !!window.openReader && typeof CAT !== 'undefined', null, { timeout: 15000 });
  const cabLegis = await page.evaluate(() => (document.querySelector('.head') || {}).textContent || '');
  ok(!EMOJI.test(cabLegis), R + 'LEGIS: cabeçalho sem emoji como ícone');
  await page.evaluate((paras) => {
    window.fetch = async () => ({ json: async () => ({ ok: true, paragraphs: paras }) });
    window.openReader(CAT.laws.find(l => l.t === 'Constituição Federal'));
  }, PARAS);
  await page.waitForFunction(() => document.querySelectorAll('#rdrDoc .art').length >= 2, null, { timeout: 10000 });
  let temNumero = true;
  try {
    await page.waitForFunction(() => document.querySelectorAll('#rdrDoc .art .jcount').length >= 2, null, { timeout: 8000 });
  } catch { temNumero = false; }
  const n = await page.evaluate(() => [...document.querySelectorAll('#rdrDoc .art .jcount')].map(b => +b.textContent));
  ok(temNumero && n.every(x => x > 0), R + 'LEGIS: cada artigo com jurisprudência mostra o número de julgados (' + n.join(', ') + ')');
  if (temNumero) {
    await page.click('#rdrDoc .art .jcount');
    const g = await page.evaluate(() => {
      const gv = document.getElementById('jGaveta');
      return {
        visivel: !!gv && getComputedStyle(gv).display !== 'none' && gv.getBoundingClientRect().height > 80,
        itens: gv ? gv.querySelectorAll('.jitem').length : 0,
        abrir: gv ? [...gv.querySelectorAll('button')].some(b => /Abrir no JURIS/.test(b.textContent)) : false,
        titulo: gv ? (gv.querySelector('.jg-tit') || {}).textContent : '',
      };
    });
    ok(g.visivel && g.itens > 0 && g.abrir && /Art\. 1/.test(g.titulo || ''),
      R + 'LEGIS: o toque no número abre a gaveta do artigo com os julgados e "Abrir no JURIS" (' + g.itens + ' itens)');
  }

  // "Abrir no JURIS" manda o ID do julgado, não o título: "Info 895 · STJ" casava a edição inteira.
  const envio = await page.evaluate(() => {
    let msg = null; window.ctEnviarAoHost = (m) => { msg = m; };
    const b = document.querySelector('#jGaveta .jabrir'); if (b) b.click();
    const d = window.__INC_VERB__ && Object.values(window.__INC_VERB__.diplomas).find(x => x.nome === 'Constituição Federal');
    return { termo: msg && msg.termo, tipo: msg && msg.type, id: d && d.artigos['1'] && d.artigos['1'][0][0] };
  });
  ok(envio.tipo === 'ctAbrirAcervo' && envio.termo && envio.termo === envio.id,
    R + 'LEGIS: "Abrir no JURIS" envia o id do julgado (' + envio.termo + ' × ' + envio.id + ')');

  // Alvo de toque ≥ 44 px no iPad e fora do selo de 48 px (não transborda o quadrado).
  const alvo = await page.evaluate(() => {
    const b = document.querySelector('#rdrDoc .art .jcount'); if (!b) return null;
    const r = b.getBoundingClientRect(); return { dentroDoSelo: !!b.closest('.badge'), h: r.height, w: r.width };
  });
  ok(alvo && !alvo.dentroDoSelo, R + 'LEGIS: o número de julgados fica fora do selo do artigo (não transborda)');

  // Artigo com letra (CPP 28 × 28-A) e artigo com ponto de milhar (CPC 1.015): cada um com a SUA lista.
  await page.evaluate(() => { document.getElementById('jGaveta').classList.remove('on'); });
  const contagem = async (lei, paras) => {
    await page.evaluate(({ lei, paras }) => {
      window.fetch = async () => ({ json: async () => ({ ok: true, paragraphs: paras }) });
      window.openReader(CAT.laws.find(l => l.t === lei));
    }, { lei, paras });
    await page.waitForFunction((n) => document.querySelectorAll('#rdrDoc .art').length >= n && document.querySelectorAll('#rdrDoc .art .jcount').length >= 1, paras.length, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(300);
    return page.evaluate(() => [...document.querySelectorAll('#rdrDoc .art')].map(a => [a.dataset.n, +((a.querySelector('.jcount') || {}).textContent || 0)]));
  };
  const cpp = await contagem('Código de Processo Penal', ['Art. 28. Ordenado o arquivamento do inquérito policial.', 'Art. 28-A. Não sendo caso de arquivamento e tendo o investigado confessado.']);
  ok(cpp.length === 2 && cpp[0][0] === '28' && cpp[1][0] === '28-A' && cpp[1][1] > cpp[0][1],
    R + 'LEGIS: art. 28-A tem a própria lista, não a do art. 28 (' + JSON.stringify(cpp) + ')');
  const cpc = await contagem('Código de Processo Civil', ['Art. 1.015. Cabe agravo de instrumento contra as decisões interlocutórias.']);
  ok(cpc.length === 1 && cpc[0][1] > 0, R + 'LEGIS: art. 1.015 (ponto de milhar) mostra o número de julgados (' + JSON.stringify(cpc) + ')');
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const { chromium } = await import('playwright-core');
  const exe = process.env.CT_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const br = await chromium.launch({ executablePath: exe, args: ['--allow-file-access-from-files'] });
  const page = await br.newPage();
  const falhas = [];
  try {
    await testarLeitorWeb(page, pathToFileURL(RAIZ).href.replace(/\/$/, ''),
      (c, l) => { console.log((c ? '✓ ' : '✗ ') + l); if (!c) falhas.push(l); });
  } catch (e) { console.log('✗ exceção: ' + (e && e.message)); falhas.push('exc'); }
  await br.close();
  process.exit(falhas.length ? 1 : 0);
}
