/* Teses de RG e Repetitivos pela fonte oficial — lotes L1, L2 e L3 (decisão da dona, 25/09/2026).
   A compilação repgeral-* veio do Dizer o Direito; os lotes trocaram pelo texto do STF e do STJ, nas
   duas cópias do acervo, a partir das referências versionadas (docs/teses-oficiais/l{1,2,3}-referencia.json,
   gerador scripts/aplicar-teses-oficiais.py):
     L1 automático (tese oficial com semelhança >= 0,8, sem correção de auditoria);
     L2 conferência com a auditoria campo a campo (a conferência vai em conferencia_auditoria);
     L3 revisão à mão com revisor cético (caso a/b/c/d; justificativa em l3-decisoes.md).
   Aqui, para CADA registro dos três lotes:
   · (a) web: enunciado IDÊNTICO ao texto oficial da referência; nenhum texto nem link do DoD
         no índice nem no texto; link da página oficial (portal.stf.jus.br / processo.stj.jus.br);
         título com o número do tema; tribunal, fonte, número, data, situação, órgão, observação e
         citação da fonte oficial; o tema é o título oficial (STF) ou a questão submetida (STJ) —
         cortado só na coluna da lista, inteiro no campo tm do verbete; Nota do Cátedra que existia
         fica (reler_nota) e a do L3 (erro de digitação na fonte oficial) é a da referência;
   · (a') relator do STF é o do julgamento (andamentos oficiais), não o atual da exportação;
   · (a'') cada id em um lote só, um tema por verbete, e nada do que ficou pendente ou foi para o L4
         (fusão/retirada) foi trocado;
   · (b) as fatias (dados/juris-text) servem o mesmo texto do juris-text.js;
   · (c) nativo: o corpus.json do VadeMecumJuris e o de cada .app em mac/build têm, para esses
         ids, os mesmos campos da web (web == nativo), e as notas de estudo deles saíram do
         notas.json. Pasta que não existe na máquina (a CI não tem o nativo) fica de fora COM
         aviso — nunca fingida;
   · (d) navegador: o verbete pinta o tema inteiro e o enunciado oficial; a lista, o tema cortado;
         e a quebra de linha da tese oficial (parágrafos, itens) PINTA no verbete (medida). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR_REF = path.join(RAIZ, 'docs', 'teses-oficiais');
const LOTES = ['L1', 'L2', 'L3'];
const DOD = /dizer ?o ?direito|buscador|dizerodireito/i;
const OFICIAL = /^https:\/\/(portal\.stf\.jus\.br|processo\.stj\.jus\.br)\//;
const CORTE = 140;

const carrega = (f, g) => { const e = {}; new Function('window', fs.readFileSync(path.join(RAIZ, f), 'utf8')).call(null, e); return e[g]; };
const numDoTitulo = (t) => { const m = /^Tema\s+(\d+)\b/.exec(String(t || '')); return m ? Number(m[1]) : null; };

const lerLote = (l) => JSON.parse(fs.readFileSync(path.join(DIR_REF, l.toLowerCase() + '-referencia.json'), 'utf8'));

/** Registros dos três lotes num objeto só, cada um com `lote`. */
export function lerReferencia() {
  const tudo = {};
  for (const l of LOTES) for (const [i, r] of Object.entries(lerLote(l).registros)) tudo[i] = { ...r, lote: l };
  return tudo;
}

/** Casos estáticos (a), (b) e (c). */
export function testarTesesOficiaisEstatico(ok, opcoes = {}) {
  const R = 'TESES OFICIAIS [' + (opcoes.motor || 'node') + '] ';
  const ref = lerReferencia();
  const ids = Object.keys(ref);
  const nLote = Object.fromEntries(LOTES.map(l => [l, Object.keys(lerLote(l).registros).length]));
  const soma = LOTES.reduce((a, l) => a + nLote[l], 0);
  ok(nLote.L1 >= 1300 && nLote.L2 >= 200 && nLote.L3 >= 100 && soma === ids.length && ids.every(i => i.startsWith('repgeral-')),
    R + 'as referências versionadas têm ' + ids.length + ' registros (L1 ' + nLote.L1 + ', L2 ' + nLote.L2 + ', L3 ' + nLote.L3
      + '), cada id num lote só, todos da compilação repgeral-*');
  const l2 = ids.filter(i => ref[i].lote === 'L2'), l3 = ids.filter(i => ref[i].lote === 'L3');
  ok(l2.every(i => Array.isArray(ref[i].conferencia_auditoria) && ref[i].conferencia_auditoria.length >= 2
      && /^auditoria mexeu/.test(ref[i].conferencia_auditoria[0])),
    R + 'L2: cada registro traz a conferência campo a campo com a correção da auditoria (' + l2.length + ')');
  const md = fs.readFileSync(path.join(DIR_REF, 'l3-decisoes.md'), 'utf8');
  const semJust = l3.filter(i => !/^[abcd]$/.test(ref[i].caso || '') || !(ref[i].justificativa || '').trim() || !md.includes(i));
  ok(semJust.length === 0, R + 'L3: cada decisão tem caso (a–d), justificativa e linha em l3-decisoes.md (' + l3.length + ')'
    + (semJust.length ? ' — sem: ' + semJust.slice(0, 3).join(', ') : ''));
  // um tema, um verbete; nada do pendente/L4 foi trocado
  const porTema = {};
  for (const i of ids) (porTema[ref[i].tribunal + ' ' + ref[i].numero] ||= []).push(i);
  const repet = Object.entries(porTema).filter(([, v]) => v.length > 1);
  ok(repet.length === 0, R + "(a'') nenhum tema oficial aparece em dois verbetes" + (repet.length ? ' (' + repet.slice(0, 2).map(([k, v]) => k + ': ' + v.join(' + ')).join('; ') + ')' : ''));
  const pend = JSON.parse(fs.readFileSync(path.join(DIR_REF, 'pendentes-l2-l4.json'), 'utf8'));
  const fora = ['L3_pendentes', 'L4_fundir', 'L4_retirar'].flatMap(k => (pend[k] || []).map(x => x.id));
  const trocado = fora.filter(i => i in ref);
  ok(fora.length > 100 && trocado.length === 0, R + "(a'') nenhum dos " + fora.length + ' registros pendentes ou do L4 está nas referências' + (trocado.length ? ' (' + trocado.slice(0, 3).join(', ') + ')' : ''));
  ok(ids.every(i => OFICIAL.test(ref[i].url) && ref[i].enunciado && !DOD.test(JSON.stringify(ref[i]))),
    R + 'a própria referência só tem texto e link oficiais');

  // (a) web
  const linhas = carrega('juris-index.js', '__JURIS_IDX__');
  const TXT = carrega('juris-text.js', '__JURIS_TXT__');
  const IDX = Object.fromEntries(linhas.map(r => [r[0], r]));
  const falta = ids.filter(i => !IDX[i] || !TXT[i]);
  ok(falta.length === 0, R + '(a) os ' + ids.length + ' ids seguem no índice e no texto web (favorito e status são por id)'
    + (falta.length ? ' (' + falta.slice(0, 3).join(', ') + ')' : ''));
  const ruins = { dod: [], link: [], titulo: [], texto: [], campos: [], tema: [], nota: [] };
  for (const i of ids) {
    const r = IDX[i], t = TXT[i], o = ref[i];
    if (!r || !t) continue;
    if (DOD.test(JSON.stringify(r)) || DOD.test(JSON.stringify(t))) ruins.dod.push(i);
    if (t.ur !== o.url || !OFICIAL.test(t.ur || '')) ruins.link.push(i);
    if (numDoTitulo(r[4]) !== o.numero || r[3] !== o.numero || r[4] !== o.titulo) ruins.titulo.push(i);
    if (t.en !== o.enunciado) ruins.texto.push(i);
    if (r[1] !== o.tribunal || r[2] !== o.fonte || r[7] !== o.data || r[8] !== o.situacao
      || (t.og || null) !== o.orgaoJulgador || (t.ob || null) !== o.observacao || (t.fp || null) !== o.fp) ruins.campos.push(i);
    // Nota do Cátedra: a da referência (L3, caso d) é a que pinta; a que existia fica (reler_nota)
    if ('co' in o ? t.co !== o.co : (o.reler_nota ? !/^Nota do Cátedra/.test(t.co || '') : false)) ruins.nota.push(i);
    const inteiro = t.tm || r[6];
    const cortado = (o.tema || '').length > CORTE;
    if (inteiro !== o.tema || (cortado
      ? !(r[6].endsWith('…') && r[6].length <= CORTE + 1 && o.tema.startsWith(r[6].slice(0, -1)) && t.tm === o.tema)
      : (r[6] !== o.tema || 'tm' in t))) ruins.tema.push(i);
  }
  const mostra = (a) => a.length ? ' (' + a.length + ': ' + a.slice(0, 3).join(', ') + ')' : '';
  ok(ruins.dod.length === 0, R + '(a) nenhum registro dos lotes tem texto ou link do Dizer o Direito' + mostra(ruins.dod));
  ok(ruins.link.length === 0, R + '(a) todo link é a página oficial do tema (STF ou STJ)' + mostra(ruins.link));
  ok(ruins.titulo.length === 0, R + '(a) título "Tema N" com o número do tema oficial' + mostra(ruins.titulo));
  ok(ruins.texto.length === 0, R + '(a) enunciado idêntico ao texto oficial guardado na referência' + mostra(ruins.texto));
  ok(ruins.campos.length === 0, R + '(a) tribunal, fonte, data, situação, órgão, observação e citação são os oficiais' + mostra(ruins.campos));
  ok(ruins.tema.length === 0, R + '(a) tema oficial inteiro no verbete e cortado (≤ ' + CORTE + ' + "…") só na coluna da lista' + mostra(ruins.tema));
  ok(ruins.nota.length === 0, R + '(a) Nota do Cátedra que existia continua no verbete e a nota nova do L3 é a da referência' + mostra(ruins.nota));
  const comNotaNova = ids.filter(i => ref[i].caso === 'd');
  // caso d: o enunciado fica LITERAL (com o erro) e a nota aponta o erro — as duas coisas juntas
  ok(comNotaNova.length > 0 && comNotaNova.every(i => 'co' in ref[i] && /Nota do Cátedra[^]*tese oficial/.test(TXT[i].co || '')
      && TXT[i].en === ref[i].enunciado),
    R + '(a) caso d: o texto oficial fica literal e a Nota do Cátedra que aponta o erro de digitação está no verbete (' + comNotaNova.length + ')');
  const t1149 = ids.find(i => ref[i].tribunal === 'STJ' && ref[i].numero === 1149);
  ok(!!t1149 && /Lei 9\.969\/1998/.test(TXT[t1149].en) && /9\.696\/1998/.test(TXT[t1149].co || ''),
    R + '(a) caso d: STJ Tema 1149 mantém "Lei 9.969/1998" como o STJ publicou e a nota diz que é a Lei 9.696/1998');
  // (a') relator do julgamento no STF, não o atual da exportação
  const achaTema = (trib, n) => ids.find(i => ref[i].tribunal === trib && ref[i].numero === n);
  const REL = [[457, /Rel\. Min\. Celso de Mello$/, 'Celso de Mello (a exportação diz Nunes Marques, que herdou o acervo)'],
    [1001, /Rel\. Min\. Cármen Lúcia · Red\. p\/ o acórdão Min\. Luís Roberto Barroso$/, 'Cármen Lúcia, vencida, redator Barroso (a exportação diz Flávio Dino)'],
    [101, /Rel\. Min\. Gilmar Mendes$/, 'Gilmar Mendes (a exportação diz "Ministro Presidente")']];
  for (const [n, re, rot] of REL) {
    const i = achaTema('STF', n);
    ok(!!i && re.test(TXT[i].fp || '') && re.test((ref[i].fp || '')),
      R + "(a') STF Tema " + n + ': o relator é o do julgamento — ' + rot + ' [' + (i && TXT[i].fp) + ']');
  }
  const presid = ids.filter(i => /Min\. (Presidente|Relator)\b/.test((TXT[i] || {}).fp || ''));
  ok(presid.length === 0, R + "(a') nenhuma citação do STF sai como \"Rel. Min. Presidente\"" + mostra(presid));
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
        || n.orgaoJulgador !== (t.og || null) || n.observacao !== (t.ob || null) || n.precedentes !== ref[i].precedentes
        || (n.comentario || null) !== (t.co || null) || DOD.test(JSON.stringify(n));
    });
    ok(dif.length === 0, R + '(c) ' + rotulo + ': web == nativo nos ' + ids.length + ' registros dos lotes' + mostra(dif));
    const fn = path.join(dir, 'notas.json');
    if (fs.existsSync(fn)) {
      const notas = JSON.parse(fs.readFileSync(fn, 'utf8'));
      const sobrou = ids.filter(i => i in notas);
      ok(sobrou.length === 0 && Object.keys(notas).length > 1000,
        R + '(c) ' + rotulo + ': as notas de estudo dos registros dos lotes saíram do notas.json (' + Object.keys(notas).length + ' notas restantes)' + mostra(sobrou));
    }
  }
}

/** Caso de navegador (d). `base` sem barra final. */
export async function testarTesesOficiaisNavegador(page, base, ok, opcoes = {}) {
  const R = 'TESES OFICIAIS [' + (opcoes.motor || '?') + '] [' + (opcoes.origem || '?') + '] ';
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

  // quebra de linha da tese oficial: o registro com mais parágrafos; mede que o trecho depois de cada
  // "\n" começa numa linha NOVA, rente à margem esquerda do bloco (sem pre-wrap tudo vira um parágrafo)
  const [idq, oq] = Object.entries(ref).filter(([, r]) => /\n/.test(r.enunciado))
    .sort((a, b) => b[1].enunciado.split('\n').length - a[1].enunciado.split('\n').length)[0];
  await page.evaluate((i) => window.jurisAbrirPorId(i), idq);
  await page.waitForFunction((en) => { const d = document.querySelector('#jrDoc .venun .bd'); return d && d.textContent === en; }, oq.enunciado, { timeout: 12000 });
  const q = await page.evaluate(() => {
    const bd = document.querySelector('#jrDoc .venun .bd');
    const tn = document.createTreeWalker(bd, NodeFilter.SHOW_TEXT);
    let no, base = 0; const nos = [];
    while ((no = tn.nextNode())) { nos.push([no, base]); base += no.data.length; }
    const pega = (k) => { for (const [n, b] of nos) if (k >= b && k < b + n.data.length) { const r = document.createRange(); r.setStart(n, k - b); r.setEnd(n, k - b + 1); return r.getBoundingClientRect(); } return null; };
    const txt = bd.textContent, caixa = bd.getBoundingClientRect(), pad = parseFloat(getComputedStyle(bd).paddingLeft) || 0;
    const quebras = [];
    for (let k = txt.indexOf('\n'); k > 0; k = txt.indexOf('\n', k + 1)) {
      let a = k - 1; while (a > 0 && /\s/.test(txt[a])) a--;
      let d = k + 1; while (d < txt.length && /\s/.test(txt[d])) d++;
      const ra = pega(a), rd = pega(d);
      if (ra && rd) quebras.push({ novaLinha: rd.top > ra.top + 2, rente: Math.abs(rd.left - (caixa.left + pad)) < 3 });
    }
    return { ws: getComputedStyle(bd).whiteSpace, quebras };
  });
  const boas = q.quebras.filter(x => x.novaLinha && x.rente).length;
  ok(/^pre-(wrap|line)$/.test(q.ws) && q.quebras.length === oq.enunciado.split('\n').length - 1 && boas === q.quebras.length,
    R + '(d) ' + idq + ': as ' + q.quebras.length + ' quebras de linha da tese oficial pintam como linha nova, rente à margem (' + boas + ' de ' + q.quebras.length + '; white-space ' + q.ws + ')');
}
