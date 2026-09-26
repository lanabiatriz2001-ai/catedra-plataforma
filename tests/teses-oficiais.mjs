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
         e a quebra de linha da tese oficial (parágrafos, itens) PINTA no verbete (medida).
   Lote L4 (fusões e retiradas) e L5 (fechamento), decisões da dona de 25/09/2026:
   · (e) um verbete por tema: os 105 ids fundidos e os 46 retirados saíram do índice, do texto, das
         fatias e do corpus nativo; nenhum registro repgeral-* sobra com texto do DoD — todos têm link
         oficial, título com o número do tema e um tema só; as 3 Notas do Cátedra que perderam o objeto
         saíram; o relator do STJ é rotulado "Rel. atual"; a tabela de migração é a mesma na web, no
         Mac/iPad e no app independente (gerada da referência);
   · (f) navegador: favorito, status e grifo de um id FUNDIDO aparecem no canônico (união, uma vez só —
         o que a pessoa desfaz depois não volta); estado de id RETIRADO fica no localStorage, órfão,
         sem erro de página e fora das contagens. O lado Swift da migração é provado pelo harness
         tests/estado-juris (scripts/testar-estado-juris.sh), que tests/sem-mapas-mentais.mjs roda.
   · (g) restaurar backup passa pela união: importarBackup do Mac/iPad (mesclarBackup → migrarRestaurado)
         e do app independente; na web nenhuma restauração de backup traz estado de verbete, e o
         destaque (★/⚡) da web é do acervo (coluna im) — o estudo pessoal é favorito/status/marca;
   · (h) navegador: estudo antigo que volta inteiro (sem est.mig) é unido na abertura seguinte; o que
         já traz est.mig não é reunido. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR_REF = path.join(RAIZ, 'docs', 'teses-oficiais');
const LOTES = ['L1', 'L2', 'L3'];
const L4 = () => JSON.parse(fs.readFileSync(path.join(DIR_REF, 'l4-referencia.json'), 'utf8'));
const DOD = /dizer ?o ?direito|buscador|dizerodireito/i;
const OFICIAL = /^https:\/\/(portal\.stf\.jus\.br|processo\.stj\.jus\.br)\//;
const CORTE = 140;

const carrega = (f, g) => { const e = {}; new Function('window', fs.readFileSync(path.join(RAIZ, f), 'utf8')).call(null, e); return e[g]; };
const numDoTitulo = (t) => { const m = /^Tema\s+(\d+)\b/.exec(String(t || '')); return m ? Number(m[1]) : null; };

const lerLote = (l) => JSON.parse(fs.readFileSync(path.join(DIR_REF, l.toLowerCase() + '-referencia.json'), 'utf8'));

/** Registros dos lotes num objeto só, cada um com `lote` (L1–L3 e o "aplicar" do L4). */
export function lerReferencia() {
  const tudo = {};
  for (const l of LOTES) for (const [i, r] of Object.entries(lerLote(l).registros)) tudo[i] = { ...r, lote: l };
  for (const [i, r] of Object.entries(L4().aplicar)) tudo[i] = { ...r, lote: 'L4' };
  return tudo;
}

/** Casos estáticos (a), (b) e (c). */
export function testarTesesOficiaisEstatico(ok, opcoes = {}) {
  const R = 'TESES OFICIAIS [' + (opcoes.motor || 'node') + '] ';
  const ref = lerReferencia();
  const ids = Object.keys(ref);
  const nLote = Object.fromEntries(LOTES.map(l => [l, Object.keys(lerLote(l).registros).length]));
  const l4 = L4();
  nLote.L4 = Object.keys(l4.aplicar).length;
  const soma = LOTES.reduce((a, l) => a + nLote[l], 0) + nLote.L4;
  ok(nLote.L1 >= 1300 && nLote.L2 >= 200 && nLote.L3 >= 100 && nLote.L4 === 1 && soma === ids.length && ids.every(i => i.startsWith('repgeral-')),
    R + 'as referências versionadas têm ' + ids.length + ' registros (L1 ' + nLote.L1 + ', L2 ' + nLote.L2 + ', L3 ' + nLote.L3
      + ', L4 ' + nLote.L4 + '), cada id num lote só, todos da compilação repgeral-*');
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
  const aindaPend = ['L3_pendentes', 'L4_fundir', 'L4_retirar'].flatMap(k => (pend[k] || []).map(x => x.id));
  ok(aindaPend.length === 0, R + "(a'') nada ficou pendente depois do L4 (pendentes-l2-l4.json vazio)" + (aindaPend.length ? ' (' + aindaPend.slice(0, 3).join(', ') + ')' : ''));
  const fora = [...Object.keys(l4.fundir), ...Object.keys(l4.retirar)];
  const trocado = fora.filter(i => i in ref);
  ok(Object.keys(l4.fundir).length === 105 && Object.keys(l4.retirar).length === 46 && trocado.length === 0,
    R + "(a'') os " + fora.length + ' ids que saem no L4 (105 fundidos + 46 retirados) não têm registro oficial' + (trocado.length ? ' (' + trocado.slice(0, 3).join(', ') + ')' : ''));
  ok(Object.values(l4.fundir).every(v => v.canonico in ref && !(v.canonico in l4.fundir) && !(v.canonico in l4.retirar)),
    R + "(a'') todo id fundido aponta um canônico que tem a tese oficial do tema e que fica no acervo");
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
    if ('co' in o ? (t.co || null) !== o.co : (o.reler_nota ? !/^Nota do Cátedra/.test(t.co || '') : false)) ruins.nota.push(i);
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
  // relator do STJ: o portal só dá o de HOJE — rotulado como tal (decisão da dona, L4)
  const stj = ids.filter(i => ref[i].tribunal === 'STJ');
  const relMau = stj.filter(i => /Rel\. (Min\.|Presidente|Vice|Des\.|Juiz)/.test((TXT[i] || {}).fp || '') || /Rel\. (Min\.|Presidente|Vice|Des\.|Juiz)/.test(ref[i].precedentes || ''));
  const relBom = stj.filter(i => / · Rel\. atual: /.test((TXT[i] || {}).fp || ''));
  ok(relMau.length === 0 && relBom.length > 700, R + '(e) STJ: a citação diz "Rel. atual: …" (' + relBom.length + ' de ' + stj.length + '), nunca "Rel. Min." como se tivesse julgado' + mostra(relMau));
  const nCortados = ids.filter(i => TXT[i] && TXT[i].tm).length;
  ok(nCortados > 0, R + '(a) há títulos longos cortados na lista (' + nCortados + '), o caso existe de fato');

  // (e) L4: um verbete por tema, fundidos e retirados fora, notas sem objeto fora
  const repg = linhas.filter(r => r[0].startsWith('repgeral-'));
  const semRef = repg.filter(r => !(r[0] in ref)).map(r => r[0]);
  ok(repg.length === ids.length && semRef.length === 0,
    R + '(e) o acervo web tem exatamente os ' + ids.length + ' verbetes repgeral-* das referências (1.943 − 105 − 46)' + mostra(semRef));
  const voltou = fora.filter(i => IDX[i] || TXT[i]);
  ok(voltou.length === 0, R + '(e) nenhum dos 151 ids fundidos ou retirados está no índice nem no texto web' + mostra(voltou));
  const porTemaWeb = {};
  for (const r of repg) (porTemaWeb[r[1] + ' ' + r[3]] ||= []).push(r[0]);
  const duas = Object.entries(porTemaWeb).filter(([, v]) => v.length > 1);
  ok(duas.length === 0, R + '(e) um verbete por tema no acervo web (' + Object.keys(porTemaWeb).length + ' temas)' + (duas.length ? ' (' + duas.slice(0, 2).map(([k, v]) => k + ': ' + v.join(' + ')).join('; ') + ')' : ''));
  const repDod = repg.filter(r => DOD.test(JSON.stringify(r)) || DOD.test(JSON.stringify(TXT[r[0]] || {}))).map(r => r[0]);
  const repLink = repg.filter(r => !OFICIAL.test((TXT[r[0]] || {}).ur || '')).map(r => r[0]);
  const repTit = repg.filter(r => numDoTitulo(r[4]) !== r[3] || r[3] == null).map(r => r[0]);
  ok(repDod.length === 0, R + '(e) nenhum registro repgeral-* do acervo web tem texto ou link do DoD' + mostra(repDod));
  ok(repLink.length === 0 && repTit.length === 0, R + '(e) todos os repgeral-* têm link oficial e título com o número do tema' + mostra(repLink.concat(repTit)));
  const t569 = 'repgeral-repercussao_geral-STF-569-2';
  ok(IDX[t569] && IDX[t569][3] === 569 && /Sistema "S"/.test((TXT[t569] || {}).en || '') && !IDX['repgeral-repercussao_geral-STF-569'],
    R + '(e) STF-569-2 é o Tema 569 (Sistema S sem concurso) e o STF-569 (legitimidade do MPT) saiu');
  const notasFora = Object.keys(l4.notas_retiradas);
  ok(notasFora.length === 3 && notasFora.every(i => TXT[i] && !TXT[i].co && ref[i].co === null && ref[i].nota_retirada),
    R + '(e) as 3 Notas do Cátedra que perderam o objeto saíram (' + notasFora.map(i => i.replace(/^repgeral-repetitivo-/, '')).join(', ') + ')');
  // tabela de migração: a mesma nas três casas, igual à referência
  const esperado = Object.entries(l4.fundir).map(([a, v]) => a + '→' + v.canonico).sort().join('|');
  const retEsp = Object.keys(l4.retirar).sort().join('|');
  const blocoDe = (src, nome) => { const m = src.match(new RegExp('<gerado:teses-oficiais-l4:' + nome + '>[^\\n]*\\n([\\s\\S]*?)\\n[^\\n]*</gerado:teses-oficiais-l4:' + nome + '>')); return m ? m[1] : null; };
  const paresDe = (b) => b == null ? null : [...b.matchAll(/['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g)].map(m => m[1] + '→' + m[2]).sort().join('|');
  const idsDe = (b) => b == null ? null : [...b.matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]).sort().join('|');
  const casas = [['juris-web.html', path.join(RAIZ, 'juris-web.html')],
    ['mac JurisEstadoPersistido.swift', path.join(RAIZ, 'mac/vendor/juris/Store/JurisEstadoPersistido.swift')],
    ['ios JurisEstadoPersistido.swift', path.join(RAIZ, 'ios/vendor/juris/Store/JurisEstadoPersistido.swift')],
    ['VadeMecumJuris LibraryStore.swift', path.join(process.env.HOME || '', 'App Jurisprudências', 'VadeMecumJuris', 'Sources', 'VadeMecum', 'Store', 'LibraryStore.swift')]];
  for (const [rot, f] of casas) {
    if (!fs.existsSync(f)) { console.log('  · ' + R + rot + ' não existe nesta máquina — fica de fora'); continue; }
    const src = fs.readFileSync(f, 'utf8');
    ok(paresDe(blocoDe(src, 'migracoes')) === esperado && idsDe(blocoDe(src, 'retirados')) === retEsp,
      R + '(e) ' + rot + ': a tabela de migração tem as 105 fusões e os 46 retirados da referência');
  }

  // (g) restauração de backup passa pela migração. O backup antigo traz estado em id fundido e não
  //     traz idsMigrados; a migração da abertura pula o id que o aparelho já marcou — sem a união na
  //     restauração, esse estudo ficava órfão. O comportamento é provado no harness Swift
  //     (tests/estado-juris, seção 8); aqui se confere que cada importarBackup usa essa regra.
  const corpoDe = (src, nome) => {
    const i = src.indexOf(nome); if (i < 0) return null;
    const a = src.indexOf('{', i); let n = 0;
    for (let k = a; k < src.length; k++) { if (src[k] === '{') n++; else if (src[k] === '}' && --n === 0) return src.slice(a, k + 1); }
    return null;
  };
  for (const plat of ['mac', 'ios']) {
    const loja = fs.readFileSync(path.join(RAIZ, plat, 'vendor/juris/Store/LibraryStore.swift'), 'utf8');
    const est = fs.readFileSync(path.join(RAIZ, plat, 'vendor/juris/Store/JurisEstadoPersistido.swift'), 'utf8');
    const imp = corpoDe(loja, 'func importarBackup(') || '', mes = corpoDe(est, 'func mesclarBackup(') || '';
    ok(/\.mesclarBackup\(/.test(imp) && /idsMigrados = s\.idsMigrados/.test(imp) && /JurisMigracaoIDs\.migrarRestaurado\(/.test(mes),
      R + '(g) ' + plat + ': importarBackup restaura pela mescla com a união das fusões (mesclarBackup → migrarRestaurado) e guarda idsMigrados');
  }
  {
    const f = casas[3][1];
    if (!fs.existsSync(f)) console.log('  · ' + R + 'VadeMecumJuris LibraryStore.swift não existe nesta máquina — (g) do app independente fica de fora');
    else {
      const imp = corpoDe(fs.readFileSync(f, 'utf8'), 'func importarBackup(') || '';
      ok(/Self\.migrarRestaurado\(/.test(imp) && /idsMigrados = s\.idsMigrados/.test(imp),
        R + '(g) VadeMecumJuris: importarBackup une o que o backup traz em id fundido no canônico (migrarRestaurado) e guarda idsMigrados');
    }
  }
  // web: o JURIS não importa backup, e o backup do Cátedra (host) não leva o estudo do JURIS — a única
  // volta de estado antigo por id é a própria chave (nuvem), provada no navegador em (h)
  const web = fs.readFileSync(path.join(RAIZ, 'juris-web.html'), 'utf8');
  const host = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
  const bkp = (corpoDe(host, '_backupObjeto(){') || '') + (corpoDe(host, '_restaurarBackup(d){') || '') + (corpoDe(host, '_cadernosDeTodasAsAreas(){') || '');
  ok(bkp.length > 2000 && !/jurisEstudo|grifosJuris|JurisRoteiros/.test(bkp) && !/FileReader|importar backup|importBackup/i.test(web),
    R + '(g) web: nenhuma restauração de backup traz estado de verbete do JURIS (o backup do host não leva jurisEstudo/grifos; o JURIS web não importa arquivo)');
  // ⚡ na web: o "Destaque" é do ACERVO (coluna im do índice), não estado da pessoa; o estudo pessoal
  // (est) só tem favorito, status e a marca da migração — e a migração trata cada um deles
  const chavesEst = [...new Set([...web.matchAll(/\best\.([a-zA-Z_]\w*)/g)].map(m => m[1]))].sort();
  const mig = corpoDe(web, 'function migraEstadoJuris(') || '';
  const pinturas = [...web.matchAll(/title="Destaque"|class="diaTag">Destaque/g)].length;
  const pelaColuna = [...web.matchAll(/r\[I\.im\]\?'<span class="(star" title="Destaque"|diaTag">Destaque)/g)].length;
  ok(chavesEst.join(',') === 'fav,mig,stat' && /est\.fav\[antigo\]/.test(mig) && /est\.stat\[antigo\]/.test(mig)
      && pinturas >= 3 && pelaColuna === pinturas,
    R + '(g) web: o destaque (★) vem só do acervo (' + pelaColuna + ' pinturas pela coluna im); o estudo pessoal é ' + chavesEst.join('/') + ' e a migração une favorito e status');

  // (b) fatias: o texto que o app baixa sob demanda é o mesmo
  const dirF = path.join(RAIZ, 'dados', 'juris-text');
  const man = JSON.parse(fs.readFileSync(path.join(dirF, 'manifesto.json'), 'utf8'));
  const fat = {};
  for (const a of man.arquivos) Object.assign(fat, JSON.parse(fs.readFileSync(path.join(dirF, a), 'utf8')));
  const difF = ids.filter(i => JSON.stringify(fat[i]) !== JSON.stringify(TXT[i]));
  ok(man.chaves === Object.keys(TXT).length && difF.length === 0,
    R + '(b) as fatias de dados/juris-text servem o texto oficial igual ao juris-text.js' + mostra(difF));
  const foraFat = fora.filter(i => i in fat);
  ok(foraFat.length === 0, R + '(b) nenhum id fundido ou retirado sobrou nas fatias' + mostra(foraFat));

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
    const natRep = Object.keys(nat).filter(i => i.startsWith('repgeral-'));
    const natFora = fora.filter(i => i in nat), natSemRef = natRep.filter(i => !(i in ref));
    ok(natRep.length === ids.length && natFora.length === 0 && natSemRef.length === 0,
      R + '(e) ' + rotulo + ': ' + natRep.length + ' verbetes repgeral-*, nenhum fundido ou retirado, nenhum fora das referências' + mostra(natFora.concat(natSemRef)));
    const fn = path.join(dir, 'notas.json');
    if (fs.existsSync(fn)) {
      const notas = JSON.parse(fs.readFileSync(fn, 'utf8'));
      const sobrou = ids.concat(fora).filter(i => i in notas);
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

/** Caso de navegador (f): migração de id do lote L4. Semeia por base + '/__semente' (404 na mesma
    origem, sem o app aberto — nada de corrida com o autosave) num contexto próprio e só então abre
    o JURIS. Só na origem http. */
export async function testarMigracaoL4Navegador(page, base, ok, opcoes = {}) {
  const R = 'TESES OFICIAIS L4 [' + (opcoes.motor || '?') + '] [' + (opcoes.origem || '?') + '] ';
  const l4 = L4();
  const pares = Object.entries(l4.fundir).sort((a, b) => a[0] < b[0] ? -1 : 1);
  const [fundido, { canonico }] = pares.find(([i]) => i === 'repgeral-repercussao_geral-STF-1234-2') || pares[0];
  const [fundido2, { canonico: canonico2 }] = pares.find(([i, v]) => i !== fundido && v.canonico !== canonico);
  const retirado = Object.keys(l4.retirar).sort()[0];
  const vivo = 'STJ-SUM-7';
  const ctx = await page.context().browser().newContext();
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', (e) => erros.push(String(e && e.message || e)));
  try {
    await p.goto(base + '/__semente');
    await p.evaluate(({ fundido, fundido2, canonico2, retirado, vivo }) => {
      localStorage.clear();
      localStorage.setItem('catedra:jurisEstudo', JSON.stringify({
        fav: { [fundido]: 1, [retirado]: 1, [vivo]: 1 },
        stat: { [fundido]: 'rev', [fundido2]: 'dom', [canonico2]: 'rev', [retirado]: 'dom' }
      }));
      localStorage.setItem('catedra:grifosJuris:' + fundido, JSON.stringify([{ gi: 0, s: 0, t: 'grifo do fundido' }]));
      localStorage.setItem('catedra:grifosJuris:' + retirado, JSON.stringify([{ gi: 0, s: 0, t: 'grifo órfão' }]));
    }, { fundido, fundido2, canonico2, retirado, vivo });
    const abre = async () => {
      await p.goto(base + '/juris-web.html');
      await p.waitForFunction(() => typeof window.jurisAbrirPorId === 'function' && document.querySelectorAll('.vcard').length > 0, null, { timeout: 25000 });
      await p.waitForTimeout(300);
    };
    await abre();
    const lido = () => p.evaluate(({ canonico, fundido, retirado }) => ({
      est: JSON.parse(localStorage.getItem('catedra:jurisEstudo') || '{}'),
      grifosCanon: JSON.parse(localStorage.getItem('catedra:grifosJuris:' + canonico) || '[]'),
      grifosFundido: localStorage.getItem('catedra:grifosJuris:' + fundido),
      grifosRetirado: localStorage.getItem('catedra:grifosJuris:' + retirado),
      fav: (document.querySelector('#s1Fav b') || {}).textContent || null,
      dom: (document.querySelector('#s1Dom b') || {}).textContent || null
    }), { canonico, fundido, retirado });
    const a = await lido();
    ok(a.est.fav[canonico] === 1 && a.est.fav[fundido] === 1 && a.grifosCanon.some(g => g.t === 'grifo do fundido') && !!a.grifosFundido,
      R + '(f) favorito e grifo do id fundido ' + fundido + ' aparecem no canônico ' + canonico + ', e a chave antiga fica como cópia');
    ok(a.est.stat[canonico] === 'rev' && a.est.stat[canonico2] === 'dom',
      R + '(f) status: vale o mais avançado (' + fundido2 + ' dominado > ' + canonico2 + ' em revisão)');
    ok(a.est.mig && a.est.mig[fundido] === 1 && a.est.mig[fundido2] === 1 && !a.est.mig[retirado],
      R + '(f) a união fica marcada em est.mig só para os ids fundidos que tinham estado');
    ok(a.est.fav[retirado] === 1 && a.est.stat[retirado] === 'dom' && !!a.grifosRetirado,
      R + '(f) o estado do id retirado ' + retirado + ' fica no localStorage, órfão (nada é apagado)');
    // favoritos no acervo: STJ-SUM-7 e o canônico; a cópia do fundido e o retirado não contam
    // dominados: só o canonico2 (o dominado do retirado e o do fundido2 não contam)
    ok(a.fav === '2' && a.dom === '1', R + '(f) as contagens ignoram cópias antigas e órfãos (favoritos ' + a.fav + ', dominados ' + a.dom + ')');
    // a pessoa desfaz no canônico: não volta na abertura seguinte
    await p.evaluate((c) => { const e = JSON.parse(localStorage.getItem('catedra:jurisEstudo')); delete e.fav[c]; localStorage.setItem('catedra:jurisEstudo', JSON.stringify(e)); }, canonico);
    await abre();
    const b = await lido();
    ok(!b.est.fav[canonico] && b.est.fav[fundido] === 1 && b.grifosCanon.filter(g => g.t === 'grifo do fundido').length === 1,
      R + '(f) a união roda uma vez só: o favorito desfeito no canônico não volta e o grifo não duplica');
    // (h) estudo ANTIGO restaurado por cima (a chave inteira volta como estava antes do L4 — é o que a
    //     nuvem ou uma cópia fazem na web): este aparelho já marcou o id, mas a marca viaja DENTRO do
    //     estudo — o restaurado não a tem, e a união roda sobre ele na abertura seguinte
    await p.evaluate((f) => localStorage.setItem('catedra:jurisEstudo', JSON.stringify({ fav: { [f]: 1 }, stat: { [f]: 'dom' } })), fundido);
    await abre();
    const h = await lido();
    ok(h.est.fav[canonico] === 1 && h.est.stat[canonico] === 'dom' && h.est.mig && h.est.mig[fundido] === 1 && h.est.fav[fundido] === 1,
      R + '(h) estudo antigo restaurado (sem est.mig): favorito e status do id fundido aparecem no canônico, e o id volta a ficar marcado');
    // e o restaurado que JÁ traz a marca (exportado depois da fusão) não é reunido: o desfeito não volta
    await p.evaluate(({ f, c }) => localStorage.setItem('catedra:jurisEstudo', JSON.stringify({ fav: { [f]: 1 }, stat: { [c]: 'rev' }, mig: { [f]: 1 } })), { f: fundido, c: canonico });
    await abre();
    const h2 = await lido();
    ok(!h2.est.fav[canonico] && h2.est.stat[canonico] === 'rev' && h2.est.fav[fundido] === 1,
      R + '(h) estudo restaurado que já traz est.mig: o id não é reunido (o favorito desfeito no canônico não volta)');
    // abrir o retirado por id não quebra nada (não existe; não abre)
    const abriu = await p.evaluate((i) => { try { window.jurisAbrirPorId(i); return 'ok'; } catch (e) { return String(e); } }, retirado);
    ok(abriu === 'ok', R + '(f) abrir por id um verbete retirado não dá erro (' + abriu + ')');
    ok(erros.length === 0, R + '(f) sem erro de página com estado órfão e cópias antigas (' + erros.slice(0, 1).join('').slice(0, 120) + ')');
  } finally {
    await ctx.close();
  }
}
