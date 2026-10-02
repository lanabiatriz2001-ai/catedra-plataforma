// scripts/lib/stf-rg.mjs — coleção "repercussão geral" do STF no sentinela (Fase 2).
//
// Rota oficial: a lista de TODOS os temas numa leitura só (exportarDados.asp). O cabeçalho diz
// vnd.ms-excel, mas o corpo é uma tabela HTML em UTF-8, com 15 colunas. Medido em 01/10/2026:
// 200, 4.021.111 B, 8,9 a 10,3 s, 1.479 temas (máximo 1485). Sem User-Agent, 403.
//
// A detecção compara a lista de hoje com a ÚLTIMA LEITURA REGISTRADA (sentinela/retratos.json,
// chave stf.rg), não com o acervo: 667 temas oficiais estão fora do CátedraJURIS e virariam
// novidade falsa. O acervo decide só `acompanhado` e a baixa ("No acervo").
//
// Prova das regras: o retrato de 25/09/2026 contra a lista de 01/10/2026, os dois inteiros,
// deu exatamente 10 itens (1071, 1113 ×2, 1253, 1470, 1483 ×3, 1484, 1485) e nenhum outro; a
// lista de 01/10 contra ela mesma, 0. As fixtures em tests/fixtures/stf-rg/ são recortes
// literais desses dois dias.
import {
  normLeve, normForte, dataBR, sha8, desentidade, dataDeISO, itemColecao, acompanhamento, linhasDoAcervo,
  novaSessao, semLinhaDeBase, travaDeVolume, LIMIARES,
} from './colecoes.mjs';

export const URL_EXPORT_RG = 'https://portal.stf.jus.br/jurisprudenciaRepercussao/exportarDados.asp?situacaoRG=TODAS&situacaoAtual=S&tipoComRG=ComRG&tipoSemRG=SemRG&tipoSemRGQC=SemRGQC&ordenacao=asc';
export const urlTemaRG = (n) => `https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=${n}`;
export const urlAndamentosRG = (inc, n) => `https://portal.stf.jus.br/jurisprudenciaRepercussao/verAndamentoProcesso.asp?incidente=${inc.incidente}&numeroProcesso=${inc.numeroProcesso}&classeProcesso=${inc.classe}&numeroTema=${n}`;
const ORIGEM = 'lista oficial do portal do STF (exportarDados.asp)';

export const CAB_RG = ['Tema', 'Leading Case', 'Relator', 'Título', 'Descrição', 'Assuntos', 'Manifestação', 'Acórdão', 'Plenário Virtual', 'Há Repercussão', 'Data do Julgamento', 'Situação do Tema', 'Tese', 'Data da Tese', 'Observação'];
const texto = (h) => desentidade(String(h).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''));
const celula = (h) => normLeve(texto(h));
// A coluna "Há Repercussão" vem com acentuação quebrada (UTF-8 lido como latin1 na origem):
// "NÃ£o hÃ¡". Só nela, e só quando o sinal aparece, a célula é recodificada.
const semMojibake = (s) => (/[ÃÂ]/.test(s) ? Buffer.from(s, 'latin1').toString('utf8') : s);
const semTraco = (s) => (s === '-' ? '' : s);

/** Lê o export. Lança quando a página não é a lista: cabeçalho diferente das 15 colunas (o
 *  "404 Desculpe" que o portal às vezes serve com HTTP 200), linha com outra contagem de
 *  células, número de tema inválido ou repetido, ou menos temas que `minLinhas`. */
export function lerExportRG(html, { minLinhas = LIMIARES.minLinhasRG } = {}) {
  const t = String(html || '');
  const thead = /<thead>([\s\S]*?)<\/thead>/i.exec(t);
  const ths = thead ? [...thead[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => celula(m[1])) : [];
  if (JSON.stringify(ths) !== JSON.stringify(CAB_RG)) throw new Error('a lista oficial não veio no formato esperado (cabeçalho das 15 colunas)');
  const corpo = t.slice(t.indexOf('</thead>'));
  const temas = new Map();
  for (const m of corpo.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const tds = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((x) => x[1]);
    if (tds.length !== 15) throw new Error(`a lista oficial trouxe uma linha com ${tds.length} células em vez de 15`);
    const numero = Number(celula(tds[0]));
    if (!Number.isInteger(numero) || numero < 1) throw new Error('a lista oficial trouxe uma linha sem número de tema');
    if (temas.has(numero)) throw new Error(`a lista oficial trouxe o Tema ${numero} repetido`);
    temas.set(numero, {
      numero,
      titulo: celula(tds[3]),
      descricao: celula(tds[4]),
      haRG: semMojibake(celula(tds[9])),
      dataJulgamento: semTraco(celula(tds[10])),
      situacao: celula(tds[11]),
      tese: semTraco(celula(tds[12])),
      dataTese: semTraco(celula(tds[13])),
      observacao: semTraco(celula(tds[14])),
    });
  }
  if (temas.size < minLinhas) throw new Error(`a lista oficial trouxe ${temas.size} temas (mínimo ${minLinhas})`);
  return temas;
}

// A lista oficial corta a tese em 8.000 caracteres; depois do normLeve, as cortadas medem 7.937
// (Tema 1234) e 7.988 (966 e 976).
export const CORTE = 7800;
const C = 'Cancelado';

/** O retrato de uma leitura: por tema, só o que a comparação usa. VAZIO NUNCA APAGA CHEIO:
 *  tese vazia hoje (7 temas do acervo estão assim: 516, 912, 936, 950, 1308, 1382, 1451) não
 *  apaga a tese registrada, nem a Data da Tese; em "Cancelado" a coluna Tese guarda o MOTIVO do
 *  cancelamento, não tese, e a registrada fica. Tema da leitura anterior que não veio hoje
 *  mantém a entrada anterior. */
export function retratoRG(temas, anteriores = {}) {
  const out = {};
  for (const [n, x] of temas) {
    const a = anteriores[n];
    const cancelado = x.situacao === C;
    out[n] = {
      s: x.situacao,
      h: x.haRG,
      t: cancelado ? (a?.t || '') : (x.tese || a?.t || ''),
      tc: cancelado ? (a?.tc || 0) : (x.tese.length >= CORTE ? 1 : (x.tese ? 0 : (a?.tc || 0))),
      dt: x.dataTese || a?.dt || '',
      ob: x.observacao ? sha8(x.observacao) : '',
    };
  }
  for (const n of Object.keys(anteriores)) if (!(n in out)) out[n] = anteriores[n];
  const nums = Object.keys(out).map(Number);
  return { ultimoTema: nums.length ? Math.max(...nums) : 0, total: nums.length, temas: out };
}

const P = 'Analisada Preliminar de Repercussão Geral', R = 'Acórdão de Repercussão Geral publicado';
const M = 'Mérito julgado', A = 'Acórdão de mérito publicado', T = 'Trânsito em Julgado';
const SITUACOES = new Set([P, R, M, A, T, C]);
export const PARCIAL_TESE_RG = 'a lista oficial do STF corta a tese em 8.000 caracteres: só o começo dela foi comparado — confira a íntegra na fonte';

/** As regras, puras. `prevTemas` = temas do retrato; `temas` = Map da lista de hoje.
 *  `acompanhamento(n)` (opcional) diz se o acervo tem o tema. Devolve { itens, sumiram }.
 *  Título, descrição, relator e data da preliminar NUNCA geram item: o relator da lista é o
 *  atual ("MINISTRO PRESIDENTE" em 299 temas), e "Data do Julgamento" é a da preliminar de
 *  repercussão geral (Tema 1113: 13/11/2020, com o mérito em 28/09/2026). */
export function compararRG(prevTemas, temas, { acompanhamento: acomp, quando } = {}) {
  const itens = [];
  const prev = prevTemas || {};
  for (const [n, x] of temas) {
    const a = prev[n];
    const ps = a ? a.s : null;
    const ha = String(x.haRG).startsWith('Há');
    const base = { fonte: 'stf', colecao: 'rg', numero: n, situacao: x.situacao, urlOficial: urlTemaRG(n), quando, ...(acomp ? acomp(n) : {}) };
    const add = (tipo, comparavel, campos) => itens.push(itemColecao({ ...base, tipo, comparavel, ...campos }));
    // 1. Tema novo na lista.
    if (!a) {
      if (ha) add('tema-afetado', String(n), { depois: x.titulo, observacao: 'Há Repercussão: ' + x.haRG });
      else add('situacao', `${x.situacao}|${x.haRG}`, { depois: x.situacao, observacao: `tema novo na lista oficial; repercussão geral negada (${x.haRG})` });
    }
    // 2. Julgamento de mérito — também quando a lista pulou o "Mérito julgado".
    if (ha && ((x.situacao === M && ps !== M) || (x.situacao === A && (ps === null || ps === P || ps === R)))) {
      add('julgamento', M, { antes: ps, depois: x.situacao, julgadoEm: dataBR(x.dataTese) });
    }
    // 3. Acórdão de mérito publicado (a data, só pelos andamentos, na rotina).
    if (x.situacao === A && ps !== A) add('acordao-publicado', A, { antes: ps, depois: x.situacao });
    // 4. Outra mudança de situação: P→R, →Trânsito, →Cancelado, ou valor fora do vocabulário.
    if (a && ps !== x.situacao && x.situacao !== M && x.situacao !== A) {
      const observacao = x.situacao === C ? (x.observacao || null)
        : (!SITUACOES.has(x.situacao) ? 'situação fora do vocabulário conhecido do STF: ' + x.situacao : null);
      add('situacao', x.situacao, { antes: ps, depois: x.situacao, observacao });
    }
    // 5. Tese fixada ou alterada. Tese oficial vazia NUNCA gera item (nem apaga a registrada).
    if (x.situacao !== C && x.tese) {
      const fa = normForte(x.tese), fb = normForte(a?.t || '');
      const cortada = x.tese.length >= CORTE || a?.tc === 1;
      let difere = fa !== fb;
      if (difere && cortada && fb) { const k = Math.min(fa.length, fb.length) - 50; difere = fa.slice(0, k) !== fb.slice(0, k); }
      if (difere) {
        add('tese-fixada', fa, { antes: a?.t || null, depois: x.tese, julgadoEm: dataBR(x.dataTese), observacao: x.observacao || null,
          ...(cortada ? { parcial: true, parcialMotivo: PARCIAL_TESE_RG } : {}) });
      }
    }
  }
  const sumiram = Object.keys(prev).map(Number).filter((n) => !temas.has(n)).sort((a, b) => a - b);
  return { itens, sumiram };
}

/** O incidente do processo paradigma, pelo link de andamentos da página tema.asp. Na página
 *  real o "&" vem cru (Tema 1485: incidente 7563417, ARE 1600294). */
export function incidenteDaPaginaTema(html, n) {
  const re = new RegExp(`verAndamentoProcesso\\.asp\\?incidente=(\\d+)(?:&|&amp;)numeroProcesso=(\\d+)(?:&|&amp;)classeProcesso=([A-Z]+)(?:&|&amp;)numeroTema=${Number(n)}\\b`);
  const m = re.exec(String(html || ''));
  return m ? { incidente: m[1], numeroProcesso: m[2], classe: m[3] } : null;
}
const incidenteDoUr = (ur) => {
  const m = /incidente=(\d+)&numeroProcesso=(\d+)&classeProcesso=([A-Z]+)/.exec(String(ur || ''));
  return m ? { incidente: m[1], numeroProcesso: m[2], classe: m[3] } : null;
};

const RE_CLASSE_RG = /^\s*[A-Z]+(?:-[A-Z]+)*-RG\b/;
const posterior = (a, b) => !!a && !!b && a.split('/').reverse().join('') > b.split('/').reverse().join('');
/** As datas oficiais nos andamentos do paradigma (linhas da mais recente para a mais antiga):
 *  julgamento de mérito; publicação do acórdão de MÉRITO (posterior ao julgamento e que não seja
 *  o acórdão da própria repercussão geral, "RE-RG."); trânsito posterior ao julgamento. Lança
 *  quando a página não traz nenhuma linha reconhecível. */
export function lerAndamentosRG(html) {
  const linhas = [...String(html || '').matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((x) => normLeve(texto(x[1]))))
    .filter((tds) => tds.length >= 4 && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(tds[0]));
  if (!linhas.length) throw new Error('andamentos sem linhas reconhecíveis');
  const jg = linhas.find((l) => /^Julgado m[ée]rito de tema com repercuss/i.test(l[1]));
  const julgadoEm = jg ? dataBR(jg[0]) : null;
  const pub = julgadoEm && linhas.find((l) => /^Publicado ac[óo]rd[ãa]o, DJE/i.test(l[1]) && posterior(dataBR(l[0]), julgadoEm) && !RE_CLASSE_RG.test(l[3]));
  const tj = julgadoEm && linhas.find((l) => /^Transitad/i.test(l[1]) && posterior(dataBR(l[0]), julgadoEm));
  return { julgadoEm, publicadoEm: pub ? dataBR(pub[0]) : null, transitadoEm: tj ? dataBR(tj[0]) : null };
}

const falha = (erro, detalhe = '') => ({ estado: 'falha', erro, detalhe, itens: [] });
const TIPOS_COM_DATA = new Set(['julgamento', 'tese-fixada', 'acordao-publicado', 'situacao']);

/** A coleção inteira. ctx = { modo, prazo, busca:{buscar, esperar}, retratos, J (função que
 *  devolve a base do acervo), limiares, quando }. */
export async function consultarRG(ctx) {
  const R = (ctx.retratos || {})['stf.rg'];
  if (!R || !R.temas || typeof R.temas !== 'object') return falha(semLinhaDeBase('stf.rg'));
  const lim = { ...LIMIARES, ...(ctx.limiares || {}) };
  const aoVivo = ctx.modo === 'ao-vivo';
  let J;
  try { J = ctx.J(); } catch (e) { return falha(`não foi possível ler o acervo do CátedraJURIS (juris-index.js): ${e.message}`); }
  const pedir = novaSessao(ctx);
  const lidoEm = new Date().toISOString();
  let lido;
  try {
    lido = await pedir(URL_EXPORT_RG, { teto: aoVivo ? 35000 : 120000, codificacao: 'utf8', ler: (r) => lerExportRG(r.texto, { minLinhas: lim.minLinhasRG }) });
  } catch (e) { return falha(`a lista oficial de repercussão geral não pôde ser lida: ${e.message}`); }
  if (lido.r.status !== 200) return falha(`a lista oficial de repercussão geral respondeu HTTP ${lido.r.status}`);
  const temas = lido.valor;
  const { itens, sumiram } = compararRG(R.temas, temas, { acompanhamento: (n) => acompanhamento(J, 'stf', 'rg', n), quando: ctx.quando || lidoEm });
  const max = Math.max(...temas.keys());
  let detalhe = `${temas.size} temas lidos na lista oficial (até o Tema ${max}), comparados com a leitura de ${dataDeISO(R.lidoEm)}`;
  if (sumiram.length > lim.sumidosMax) {
    return falha(`${sumiram.length} temas da leitura anterior não vieram na lista oficial (ex.: ${sumiram.slice(0, 5).join(', ')}): leitura suspeita`, detalhe);
  }
  const erros = [];
  if (sumiram.length) {
    erros.push(sumiram.length === 1
      ? `Tema ${sumiram[0]} não veio na lista oficial; não é tratado como cancelamento`
      : `Temas ${sumiram.join(', ')} não vieram na lista oficial; não são tratados como cancelamento`);
  }
  const vol = travaDeVolume(itens.length, R.lidoEm, lim.volumeMax);
  if (vol) erros.push(vol);

  if (aoVivo) detalhe += '; datas dos andamentos só na rotina diária';
  else {
    // Datas oficiais dos andamentos: só dos temas que mudaram de fase, até 10 por rodada, os
    // acompanhados primeiro. Falha aqui não muda o resultado da coleção.
    const comData = new Set(itens.filter((i) => i.tipo === 'julgamento' || i.tipo === 'acordao-publicado'
      || (i.tipo === 'situacao' && i.depois === T)).map((i) => i.numero));
    const alvo = [...comData].sort((a, b) => {
      const acA = itens.some((i) => i.numero === a && i.acompanhado), acB = itens.some((i) => i.numero === b && i.acompanhado);
      return acA !== acB ? (acA ? -1 : 1) : b - a;
    }).slice(0, 10);
    let k = 0;
    for (const n of alvo) {
      try {
        let inc = null;
        for (const r of linhasDoAcervo(J, 'stf', 'rg', n)) { inc = incidenteDoUr(J.ur ? J.ur(r[0]) : null); if (inc) break; }
        if (!inc) {
          const p = await pedir(urlTemaRG(n), { teto: 30000, codificacao: 'utf8',
            ler: (r) => { const x = incidenteDaPaginaTema(r.texto, n); if (!x) throw new Error('página do tema sem o link dos andamentos'); return x; } });
          if (p.r.status !== 200) throw new Error(`HTTP ${p.r.status}`);
          inc = p.valor;
        }
        const a = await pedir(urlAndamentosRG(inc, n), { teto: 30000, codificacao: 'utf8', ler: (r) => lerAndamentosRG(r.texto) });
        if (a.r.status !== 200) throw new Error(`HTTP ${a.r.status}`);
        for (const it of itens) {
          if (it.numero !== n || !TIPOS_COM_DATA.has(it.tipo)) continue;
          for (const c of ['julgadoEm', 'publicadoEm', 'transitadoEm']) if (it[c] == null && a.valor[c]) it[c] = a.valor[c];
        }
        k++;
      } catch (_) { /* sem a data, o item segue: ela é complemento, não condição */ }
    }
    detalhe += `; datas oficiais lidas em ${k} de ${alvo.length} tema(s)`;
  }
  return {
    estado: erros.length ? 'parcial' : (itens.length ? 'novidades' : 'sem-novidade'),
    erro: erros.length ? erros.join('; ') : null,
    detalhe,
    itens,
    retrato: { lidoEm, origem: ORIGEM, ...retratoRG(temas, R.temas) },
  };
}
