/* Teses de RG e Repetitivos pela fonte oficial — lote L1 (decisão da dona, 25/09/2026).
   A compilação repgeral-* veio do Dizer o Direito; o L1 trocou pelo texto do STF e do STJ os
   registros automáticos (tese oficial com semelhança >= 0,8 ao texto antigo, sem correção de
   auditoria), nas duas cópias do acervo, a partir da mesma referência versionada
   (docs/teses-oficiais/l1-referencia.json, gerador scripts/aplicar-teses-oficiais.py).
   Aqui, para CADA registro do L1:
   · (a) web: enunciado IDÊNTICO ao texto oficial da referência; nenhum texto nem link do DoD
         no índice nem no texto; link da página oficial (portal.stf.jus.br / processo.stj.jus.br);
         título com o número do tema; tribunal, fonte, número, data, situação e órgão da fonte
         oficial; o tema é o título oficial (STF) ou a questão submetida (STJ) — cortado só na
         coluna da lista, inteiro no campo tm do verbete;
   · (b) as fatias (dados/juris-text) servem o mesmo texto do juris-text.js;
   · (c) nativo: o corpus.json do VadeMecumJuris e o de cada .app em mac/build têm, para esses
         ids, os mesmos campos da web (web == nativo), e as notas de estudo deles saíram do
         notas.json. Pasta que não existe na máquina (a CI não tem o nativo) fica de fora COM
         aviso — nunca fingida;
   · (d) navegador: o verbete pinta o tema inteiro e o enunciado oficial; a lista, o tema cortado. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REF = path.join(RAIZ, 'docs', 'teses-oficiais', 'l1-referencia.json');
const DOD = /dizer ?o ?direito|buscador|dizerodireito/i;
const OFICIAL = /^https:\/\/(portal\.stf\.jus\.br|processo\.stj\.jus\.br)\//;
const CORTE = 140;

const carrega = (f, g) => { const e = {}; new Function('window', fs.readFileSync(path.join(RAIZ, f), 'utf8')).call(null, e); return e[g]; };
const numDoTitulo = (t) => { const m = /^Tema\s+(\d+)\b/.exec(String(t || '')); return m ? Number(m[1]) : null; };

export function lerReferencia() {
  return JSON.parse(fs.readFileSync(REF, 'utf8')).registros;
}

/** Casos estáticos (a), (b) e (c). */
export function testarTesesOficiaisEstatico(ok, opcoes = {}) {
  const R = 'TESES OFICIAIS L1 [' + (opcoes.motor || 'node') + '] ';
  const ref = lerReferencia();
  const ids = Object.keys(ref);
  ok(ids.length >= 1300 && ids.every(i => i.startsWith('repgeral-')),
    R + 'a referência versionada tem ' + ids.length + ' registros, todos da compilação repgeral-*');
  ok(ids.every(i => OFICIAL.test(ref[i].url) && ref[i].enunciado && !DOD.test(JSON.stringify(ref[i]))),
    R + 'a própria referência só tem texto e link oficiais');

  // (a) web
  const linhas = carrega('juris-index.js', '__JURIS_IDX__');
  const TXT = carrega('juris-text.js', '__JURIS_TXT__');
  const IDX = Object.fromEntries(linhas.map(r => [r[0], r]));
  const falta = ids.filter(i => !IDX[i] || !TXT[i]);
  ok(falta.length === 0, R + '(a) os ' + ids.length + ' ids seguem no índice e no texto web (favorito e status são por id)'
    + (falta.length ? ' (' + falta.slice(0, 3).join(', ') + ')' : ''));
  const ruins = { dod: [], link: [], titulo: [], texto: [], campos: [], tema: [] };
  for (const i of ids) {
    const r = IDX[i], t = TXT[i], o = ref[i];
    if (!r || !t) continue;
    if (DOD.test(JSON.stringify(r)) || DOD.test(JSON.stringify(t))) ruins.dod.push(i);
    if (t.ur !== o.url || !OFICIAL.test(t.ur || '')) ruins.link.push(i);
    if (numDoTitulo(r[4]) !== o.numero || r[3] !== o.numero || r[4] !== o.titulo) ruins.titulo.push(i);
    if (t.en !== o.enunciado) ruins.texto.push(i);
    if (r[1] !== o.tribunal || r[2] !== o.fonte || r[7] !== o.data || r[8] !== o.situacao
      || (t.og || null) !== o.orgaoJulgador || (t.ob || null) !== o.observacao || (t.fp || null) !== o.fp) ruins.campos.push(i);
    const inteiro = t.tm || r[6];
    const cortado = (o.tema || '').length > CORTE;
    if (inteiro !== o.tema || (cortado
      ? !(r[6].endsWith('…') && r[6].length <= CORTE + 1 && o.tema.startsWith(r[6].slice(0, -1)) && t.tm === o.tema)
      : (r[6] !== o.tema || 'tm' in t))) ruins.tema.push(i);
  }
  const mostra = (a) => a.length ? ' (' + a.length + ': ' + a.slice(0, 3).join(', ') + ')' : '';
  ok(ruins.dod.length === 0, R + '(a) nenhum registro do L1 tem texto ou link do Dizer o Direito' + mostra(ruins.dod));
  ok(ruins.link.length === 0, R + '(a) todo link é a página oficial do tema (STF ou STJ)' + mostra(ruins.link));
  ok(ruins.titulo.length === 0, R + '(a) título "Tema N" com o número do tema oficial' + mostra(ruins.titulo));
  ok(ruins.texto.length === 0, R + '(a) enunciado idêntico ao texto oficial guardado na referência' + mostra(ruins.texto));
  ok(ruins.campos.length === 0, R + '(a) tribunal, fonte, data, situação, órgão, observação e citação são os oficiais' + mostra(ruins.campos));
  ok(ruins.tema.length === 0, R + '(a) tema oficial inteiro no verbete e cortado (≤ ' + CORTE + ' + "…") só na coluna da lista' + mostra(ruins.tema));
  const nCortados = ids.filter(i => TXT[i] && TXT[i].tm).length;
  ok(nCortados > 0, R + '(a) há títulos longos cortados na lista (' + nCortados + '), o caso existe de fato');

  // (b) fatias: o texto que o app baixa sob demanda é o mesmo
  const dirF = path.join(RAIZ, 'dados', 'juris-text');
  const man = JSON.parse(fs.readFileSync(path.join(dirF, 'manifesto.json'), 'utf8'));
  const fat = {};
  for (const a of man.arquivos) Object.assign(fat, JSON.parse(fs.readFileSync(path.join(dirF, a), 'utf8')));
  const difF = ids.filter(i => JSON.stringify(fat[i]) !== JSON.stringify(TXT[i]));
  ok(man.chaves === Object.keys(TXT).length && difF.length === 0,
    R + '(b) as fatias de dados/juris-text servem o texto oficial igual ao juris-text.js' + mostra(difF));

  // (c) nativo
  const corpora = [['VadeMecumJuris (origem)', path.join(process.env.HOME || '', 'App Jurisprudências', 'VadeMecumJuris', 'Sources', 'VadeMecum', 'Resources')]];
  const macBuild = path.join(RAIZ, 'mac', 'build');
  if (fs.existsSync(macBuild)) for (const n of fs.readdirSync(macBuild)) {
    if (n.endsWith('.app')) corpora.push(['mac/build/' + n, path.join(macBuild, n, 'Contents', 'Resources')]);
  }
  for (const [rotulo, dir] of corpora) {
    const f = path.join(dir, 'corpus.json');
    if (!fs.existsSync(f)) { console.log('  · ' + R + rotulo + '/corpus.json não existe nesta máquina — fica de fora'); continue; }
    const nat = Object.fromEntries(JSON.parse(fs.readFileSync(f, 'utf8')).map(r => [r.id, r]));
    const dif = ids.filter(i => {
      const n = nat[i], r = IDX[i], t = TXT[i];
      if (!n || !r || !t) return true;
      return n.enunciado !== t.en || n.url !== t.ur || n.tema !== (t.tm || r[6]) || n.titulo !== r[4]
        || n.tribunal !== r[1] || n.fonte !== r[2] || n.numero !== r[3] || n.data !== r[7] || n.situacao !== r[8]
        || n.orgaoJulgador !== (t.og || null) || n.observacao !== (t.ob || null) || DOD.test(JSON.stringify(n));
    });
    ok(dif.length === 0, R + '(c) ' + rotulo + ': web == nativo nos ' + ids.length + ' registros do L1' + mostra(dif));
    const fn = path.join(dir, 'notas.json');
    if (fs.existsSync(fn)) {
      const notas = JSON.parse(fs.readFileSync(fn, 'utf8'));
      const sobrou = ids.filter(i => i in notas);
      ok(sobrou.length === 0 && Object.keys(notas).length > 1000,
        R + '(c) ' + rotulo + ': as notas de estudo dos registros do L1 saíram do notas.json (' + Object.keys(notas).length + ' notas restantes)' + mostra(sobrou));
    }
  }
}

/** Caso de navegador (d). `base` sem barra final. */
export async function testarTesesOficiaisNavegador(page, base, ok, opcoes = {}) {
  const R = 'TESES OFICIAIS L1 [' + (opcoes.motor || '?') + '] [' + (opcoes.origem || '?') + '] ';
  const ref = lerReferencia();
  // o registro de título oficial mais longo: é o que mais castiga a lista e o verbete
  const [id, o] = Object.entries(ref).sort((a, b) => (b[1].tema || '').length - (a[1].tema || '').length)[0];
  await page.goto(base + '/juris-web.html');
  await page.waitForFunction(() => typeof window.jurisAbrirPorId === 'function' && !!window.__JURIS_IDX__
    && document.querySelectorAll('.vcard').length > 0, null, { timeout: 25000 });
  // lista: busca pelo título ("Tema N (…)") e mede o tema do card
  const lista = await page.evaluate(async ({ id, titulo }) => {
    const q = document.getElementById('q');
    q.value = titulo; q.dispatchEvent(new Event('input', { bubbles: true }));
    for (let k = 0; k < 40 && !document.querySelector('.vcard[data-id="' + id + '"]'); k++) await new Promise(r => setTimeout(r, 150));
    const card = document.querySelector('.vcard[data-id="' + id + '"]');
    const te = card && card.querySelector('.tema');
    const cx = te && te.getBoundingClientRect();
    return { achou: !!card, tema: te ? te.textContent : null, pinta: !!(cx && cx.width > 0 && cx.height > 0) };
  }, { id, titulo: o.titulo });
  ok(lista.achou && lista.pinta && lista.tema.endsWith('…') && lista.tema.length <= CORTE + 1 && o.tema.startsWith(lista.tema.slice(0, -1)),
    R + '(d) ' + id + ': o card da lista pinta o título oficial cortado (' + (lista.tema || '').length + ' de ' + o.tema.length + ' caracteres)');
  // verbete: tema inteiro, enunciado oficial e link oficial
  await page.evaluate((i) => window.jurisAbrirPorId(i), id);
  await page.waitForFunction(() => { const d = document.querySelector('#jrDoc .venun .bd'); return d && d.textContent.length > 40; }, null, { timeout: 12000 });
  const v = await page.evaluate(() => {
    const te = document.querySelector('#jrDoc .vhero .tema'), en = document.querySelector('#jrDoc .venun .bd'),
      a = document.querySelector('#jrDoc .vfoot a');
    const cx = te && te.getBoundingClientRect(), cs = te && getComputedStyle(te);
    return { tema: te ? te.textContent : null, en: en ? en.textContent : null, link: a ? a.getAttribute('href') : null,
      pinta: !!(cx && cx.width > 0 && cx.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none') };
  });
  ok(v.pinta && v.tema === o.tema, R + '(d) ' + id + ': o verbete pinta o título oficial INTEIRO (' + (v.tema || '').length + ' caracteres)');
  ok(v.en === o.enunciado, R + '(d) ' + id + ': o verbete mostra o enunciado oficial, idêntico à referência');
  ok(v.link === o.url, R + '(d) ' + id + ': "Ver no tribunal" leva à página oficial do tema');
}
