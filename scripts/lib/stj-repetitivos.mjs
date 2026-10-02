// scripts/lib/stj-repetitivos.mjs — coleção "recursos repetitivos" do STJ no sentinela (Fase 2).
//
// Rota oficial: a pesquisa do Portal de Precedentes Qualificados (pesquisa.jsp, ISO-8859-1),
// em faixas de 50 temas. Página cheia: 6 a 10,8 s; página vazia: 0,34 s; o portal já oscilou
// até 30 s. A ficha traz situação, órgão, questão, tese, anotações do NUGEPNAC e os processos
// com as datas (afetação, julgamento, publicação do acórdão, trânsito).
//
// Duas leituras, por orçamento:
//  • ao vivo (botão, 45 s): só a CAUDA — os temas a partir do último conhecido —, com âncora;
//    a coleção sai sempre "parcial";
//  • rotina diária: a varredura completa, faixa por faixa (31 pedidos, 5 a 7 min).
//
// A detecção compara com a última leitura registrada (sentinela/retratos.json, chave
// stj.repetitivos), não com o acervo: partindo do maior tema do acervo (1421), os temas 1422 a
// 1474 virariam 53 "tema afetado" falsos.
//
// O leitor (parsePaginaRepetitivos/parseBloco) foi validado nos 1.474 temas da leitura de
// 25/09/2026, com zero erro; a modulação, nos 18 temas que a registram.
import {
  normLeve, normForte, sha8, desentidade, dataDeISO, itemColecao, acompanhamento,
  novaSessao, semLinhaDeBase, travaDeVolume, LIMIARES,
} from './colecoes.mjs';

const PESQUISA = 'https://processo.stj.jus.br/repetitivos/temas_repetitivos/pesquisa.jsp?novaConsulta=true&tipo_pesquisa=T';
export const urlFaixaRep = (a, b) => `${PESQUISA}&cod_tema_inicial=${a}&cod_tema_final=${b}&quantidadeResultadosPorPagina=50`;
export const urlTemaRep = (n) => `${PESQUISA}&cod_tema_inicial=${n}&cod_tema_final=${n}`;
const ORIGEM = 'fichas oficiais do Portal de Precedentes Qualificados do STJ (pesquisa.jsp, varredura completa)';

export function texto(s) {
  if (s == null) return null;
  let t = String(s).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '');
  t = desentidade(t).replace(/\u00a0/g, ' ').replace(/[ \t\r\f\v]+/g, ' ').replace(/\s*\n\s*/g, '\n');
  return t.trim();
}
const RE_DATA = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const dataOuNull = (s) => (s && RE_DATA.test(s) ? s : null);
const cmpData = (a, b) => { const f = (s) => s.split('/').reverse().join(''); return f(a) < f(b) ? -1 : f(a) > f(b) ? 1 : 0; };

/** O "Temas (N)" (dentro de #tipoPrecedenteT) e o "N documentos encontrados". */
export function totalDaPagina(html) {
  const a = String(html).match(/id="tipoPrecedenteT"[\s\S]{0,200}?Temas\s*\((\d+)\)/);
  const b = String(html).match(/(\d+)\s+documentos?\s+encontrados?/);
  return { temas: a ? +a[1] : null, documentos: b ? +b[1] : null };
}
function campoProcesso(bloco, rotulo) {
  const re = new RegExp('titulo_campo_processo">\\s*' + rotulo + '\\s*</div>\\s*<div class="[^"]*dados_campo_processo[^"]*">([\\s\\S]*?)</div>');
  const m = bloco.match(re);
  return m ? texto(m[1]) : null;
}

const RE_MODULACAO = /^\s*(Modula[çc][ãa]o de efeitos|Modula-se)/i;
/** O registro de modulação nas anotações do NUGEPNAC: a linha que COMEÇA com "Modulação de
 *  efeitos" (ou "Modula-se"); se ela termina em ":", leva as linhas seguintes (até 3 linhas e
 *  1.200 caracteres). Menção solta ("não há necessidade de modulação", Tema 1339) e supressão
 *  (Tema 1080) não contam. Sem o registro, null — o que não prova que não houve modulação. */
export function trechoModulacao(anotacoes) {
  const linhas = String(anotacoes || '').split('\n');
  const i = linhas.findIndex((l) => RE_MODULACAO.test(l));
  if (i < 0) return null;
  const partes = [linhas[i].trim()];
  for (let j = i + 1; j < linhas.length && partes.length < 3 && /:\s*$/.test(partes[partes.length - 1]); j++) {
    if (linhas[j].trim()) partes.push(linhas[j].trim());
  }
  const t = partes.join('\n');
  return t.length > 1200 ? t.slice(0, 1200) + '…' : t;
}

/** Um bloco "containerDocumento" da página → o tema, ou null se não for bloco de tema. */
export function parseBloco(b) {
  const mn = b.match(/Tema Repetitivo\s*<span[^>]*>\s*(\d+)\s*<\/span>/);
  if (!mn) return null;
  const t = { numero: +mn[1] };
  t.situacao = campoProcesso(b, 'Situação');
  t.orgao = campoProcesso(b, 'Órgão julgador');
  t.ramo = campoProcesso(b, 'Ramo do direito');
  t.campos = {};
  const reTxt = /titulo_campo campo_texto[^"]*">\s*([\s\S]*?)\s*<\/div>\s*<div class="col-9 dados_campo campo_texto[^"]*">([\s\S]*?)<\/div>\s*<\/div>/g;
  for (const m of b.matchAll(reTxt)) t.campos[texto(m[1])] = texto(m[2]);
  t.questao = t.campos['Questão submetida a julgamento'] ?? null;
  t.tese = t.campos['Tese Firmada'] ?? null;
  t.anotacoes = t.campos['Anotações NUGEPNAC'] ?? null;
  t.processos = [];
  for (const p of b.split(/<div class="row cabecalho_processo/).slice(1)) {
    const mp = p.match(/<b>\s*([^<]+?)\s*<\/b>\s*<\/a>/);
    if (!mp) continue;
    const pr = { processo: texto(mp[1]), principal: /title="Paradigma Principal"/.test(p.slice(0, 600)) };
    for (const m of p.matchAll(/<div class="col-5 titulo_campo">\s*([\s\S]*?)\s*<\/div>\s*<div class="col-7 dados_campo">([\s\S]*?)<\/div>\s*<\/div>/g)) pr[texto(m[1])] = texto(m[2]);
    t.processos.push(pr);
  }
  const mu = b.match(/Última atualização:\s*(\d{2}\/\d{2}\/\d{4})/);
  t.ultimaAtualizacao = mu ? mu[1] : null;
  // As datas do tema são as do paradigma principal (1.471 dos 1.474 temas têm exatamente um);
  // na falta dele, a MAIS RECENTE entre os processos (Tema 50: principal julgado em 15/09/2026,
  // outro em 09/08/2011). Elas mudam sem mexer na "Última atualização" (Tema 1212), que por isso
  // nunca é sinal de mudança.
  const principal = t.processos.find((p) => p.principal) || {};
  const prim = (k) => dataOuNull(principal[k]) || t.processos.map((p) => dataOuNull(p[k])).filter(Boolean).sort(cmpData).pop() || null;
  t.afetadoEm = prim('Afetação');
  t.julgadoEm = prim('Julgado em');
  t.publicadoEm = prim('Acórdão publicado em');
  t.transitadoEm = prim('Trânsito em Julgado');
  t.modulacao = trechoModulacao(t.anotacoes) != null;
  // "*Aguardando a publicação do acórdão…" no campo Tese Firmada NÃO é tese (Temas 50, 929,
  // 1228 e 1384 em 25/09/2026).
  t.teseMarcador = !!t.tese && /^\s*\*|^\s*aguardando/i.test(t.tese);
  return t;
}

/** A página inteira. Lança quando ela não tem o formato esperado: contadores ausentes ou
 *  discordantes, número de blocos diferente de min(N, porPagina), bloco sem situação, órgão ou
 *  questão. Página vazia consistente ("Temas (0)", "0 documentos") devolve { total: 0, temas: [] }. */
export function parsePaginaRepetitivos(html, { porPagina = 50 } = {}) {
  const tot = totalDaPagina(html);
  if (tot.temas == null || tot.documentos == null) throw new Error('página sem o contador "Temas (N)"/"N documentos encontrados": o portal mudou de formato ou não respondeu a pesquisa');
  if (tot.temas !== tot.documentos) throw new Error(`contadores discordam: Temas (${tot.temas}) × ${tot.documentos} documentos`);
  const temas = String(html).split(/<div class="container containerDocumento">/).slice(1).map(parseBloco).filter(Boolean);
  const esperado = Math.min(tot.temas, porPagina);
  if (temas.length !== esperado) throw new Error(`a página anuncia ${tot.temas} temas e o leitor achou ${temas.length} (esperado ${esperado})`);
  for (const t of temas) if (!t.situacao || !t.orgao || !t.questao) throw new Error(`Tema ${t.numero}: ficha sem situação, órgão ou questão — o formato mudou`);
  return { total: tot.temas, temas };
}

/** O retrato de um tema, só com o que a comparação usa. VAZIO NUNCA APAGA CHEIO: tese real e
 *  datas que vieram vazias hoje mantêm as registradas. */
export function retratoTemaRep(t, anterior) {
  const real = t.tese && !t.teseMarcador ? normLeve(t.tese) : '';
  const trecho = trechoModulacao(t.anotacoes);
  const a = anterior || {};
  return {
    s: t.situacao,
    t: real || a.t || '',
    m: t.teseMarcador ? 1 : 0,
    af: t.afetadoEm || a.af || '',
    jg: t.julgadoEm || a.jg || '',
    pb: t.publicadoEm || a.pb || '',
    tj: t.transitadoEm || a.tj || '',
    md: trecho ? sha8(normLeve(trecho)) : '',
    ea: t.campos && t.campos['Entendimento Anterior'] ? 1 : 0,
  };
}

const MJ = 'Mérito Julgado', AP = 'Acórdão Publicado', TJ = 'Trânsito em Julgado';
const POS = new Set([MJ, AP, 'Acórdão Publicado - RE Pendente', TJ, 'Revisado']);
// As 11 situações vistas nas 1.474 fichas de 25/09/2026.
const SITUACOES = new Set(['Afetado', 'Afetado - Possível Revisão de Tese', MJ, AP, 'Acórdão Publicado - RE Pendente', TJ,
  'Revisado', 'Cancelado', 'Sobrestado', 'Em Julgamento', 'Sem Processo Vinculado']);
const PADRAO = { s: 'Afetado', t: '', m: 0, af: '', jg: '', pb: '', tj: '', md: '', ea: 0 };
const defasagem = (ficha) => `a ficha ainda diz "${ficha}"; a data já consta do processo paradigma`;

/** As regras, puras. `prevTemas` = temas do retrato; `temasLidos` = temas da página.
 *  Os tipos nascem da DATA do processo paradigma, não da situação, que anda atrasada (os Temas
 *  1201 e 1212 seguem "Acórdão Publicado" com trânsito). */
export function compararRepetitivos(prevTemas, temasLidos, { acompanhamento: acomp, quando } = {}) {
  const itens = [];
  const prev = prevTemas || {};
  for (const t of temasLidos) {
    const n = t.numero;
    const cur = retratoTemaRep(t);
    const novo = !prev[n];
    const P = prev[n] || PADRAO;
    const base = { fonte: 'stj', colecao: 'repetitivos', numero: n, situacao: cur.s, urlOficial: urlTemaRep(n), quando, ...(acomp ? acomp(n) : {}) };
    const add = (tipo, comparavel, campos) => itens.push(itemColecao({ ...base, tipo, comparavel, ...campos }));
    // 1. Tema novo na lista: afetado.
    if (novo) add('tema-afetado', String(n), { depois: t.questao, afetadoEm: cur.af || null });
    // 2. Julgamento: data nova de julgamento (Tema 50, rejulgado), ou a ficha passou a "Mérito Julgado".
    if ((cur.jg && cur.jg !== P.jg) || (cur.s === MJ && P.s !== MJ)) {
      const depois = POS.has(cur.s) ? cur.s : MJ;
      add('julgamento', cur.jg || cur.s, { antes: P.s, depois, julgadoEm: cur.jg || null, observacao: depois !== cur.s ? defasagem(cur.s) : null });
    }
    // 3. Tese firmada ou alterada. O marcador "*Aguardando…" nunca é tese (cur.t vem vazio).
    if (cur.t && normForte(cur.t) !== normForte(P.t)) {
      add('tese-fixada', normForte(cur.t), { antes: P.t || (novo ? (t.campos['Entendimento Anterior'] || null) : null), depois: cur.t, julgadoEm: cur.jg || null });
    }
    // 4. Acórdão publicado, pela data.
    const emitiuAcordao = !!(cur.pb && cur.pb !== P.pb);
    if (emitiuAcordao) {
      const depois = POS.has(cur.s) && cur.s !== MJ ? cur.s : AP;
      add('acordao-publicado', cur.pb, { antes: P.s, depois, publicadoEm: cur.pb, julgadoEm: cur.jg || null, observacao: depois !== cur.s ? defasagem(cur.s) : null });
    }
    // 5. Outra mudança de situação (no máximo um item por tema e rodada), ou trânsito novo.
    const mudou = cur.s !== P.s && cur.s !== MJ && !(cur.s === AP && emitiuAcordao) && !(novo && cur.s === 'Afetado');
    const tj = !!(cur.tj && cur.tj !== P.tj);
    if (mudou || tj) {
      const depois = tj && cur.s !== TJ ? TJ : cur.s;
      const observacao = !SITUACOES.has(cur.s) ? 'situação fora do vocabulário conhecido do STJ: ' + cur.s
        : (depois !== cur.s ? defasagem(cur.s) : null);
      add('situacao', `${depois}|${cur.tj}`, { antes: P.s, depois, transitadoEm: cur.tj || null, observacao });
    }
    // 6. Modulação, quando o STJ a registra nas anotações.
    if (cur.md && cur.md !== P.md) add('modulacao', cur.md, { antes: null, depois: trechoModulacao(t.anotacoes) });
  }
  return itens;
}

/** As faixas da varredura completa: de 1 até a que contém o último tema conhecido, mais UMA
 *  inteiramente acima dele (é ela que acha os temas novos). Com 1474: 31 faixas, até 1501–1550.
 *  A varredura segue além enquanto a última faixa lida voltar cheia. */
export function faixasDaVarredura(ultimoTema) {
  const k = Math.max(1, Math.ceil(Math.max(0, ultimoTema) / 50));
  return Array.from({ length: k + 1 }, (_, i) => [i * 50 + 1, (i + 1) * 50]);
}

const falha = (erro, detalhe = '') => ({ estado: 'falha', erro, detalhe, itens: [] });
const lerPagina = (r) => parsePaginaRepetitivos(r.texto, { porPagina: 50 });

/** A coleção inteira. ctx = { modo, prazo, busca, retratos, J, limiares, quando }. */
export async function consultarRepetitivos(ctx) {
  const R = (ctx.retratos || {})['stj.repetitivos'];
  if (!R || !R.temas || typeof R.temas !== 'object' || !R.ultimoTema) return falha(semLinhaDeBase('stj.repetitivos'));
  const lim = { ...LIMIARES, ...(ctx.limiares || {}) };
  let J;
  try { J = ctx.J(); } catch (e) { return falha(`não foi possível ler o acervo do CátedraJURIS (juris-index.js): ${e.message}`); }
  const acomp = (n) => acompanhamento(J, 'stj', 'repetitivos', n);
  const pedir = novaSessao(ctx);
  const quando = ctx.quando || new Date().toISOString();
  const u = R.ultimoTema;

  if (ctx.modo === 'ao-vivo') {
    // A CAUDA, com âncora: o Tema u TEM de voltar (tema cancelado continua na pesquisa). Se não
    // voltar — inclusive na página vazia —, a pesquisa falhou ou o portal mudou.
    let lido;
    try { lido = await pedir(urlFaixaRep(u, u + 49), { teto: 25000, codificacao: 'latin1', ler: lerPagina }); } catch (e) {
      return falha(`a consulta da cauda dos repetitivos (a partir do Tema ${u}) falhou: ${e.message}`);
    }
    if (lido.r.status !== 200) return falha(`a consulta da cauda dos repetitivos respondeu HTTP ${lido.r.status}`);
    const { temas } = lido.valor;
    if (!temas.some((t) => t.numero === u)) return falha(`a âncora (Tema ${u}, último conhecido) não voltou na consulta: o portal mudou de formato ou a pesquisa falhou`);
    const fora = temas.find((t) => t.numero < u || t.numero > u + 49);
    if (fora) return falha(`a consulta da cauda trouxe o Tema ${fora.numero}, fora da faixa pedida (${u}–${u + 49})`);
    const itens = compararRepetitivos(R.temas, temas, { acompanhamento: acomp, quando });
    const erros = [`consulta só da cauda (temas a partir do Tema ${u}); julgamento, tese e publicação dos temas já existentes ficam para a varredura completa da rotina diária`];
    if (temas.length >= 50) erros.push('há mais de 49 temas acima do último conhecido; o resto fica para a rotina diária');
    const vol = travaDeVolume(itens.length, R.lidoEm, lim.volumeMax);
    if (vol) erros.push(vol);
    return { estado: 'parcial', erro: erros.join('; '), detalhe: `cauda a partir do Tema ${u}: ${temas.length} tema(s) lido(s); varredura completa só na rotina diária`, itens };
  }

  // Rotina: a varredura completa.
  const faixas = faixasDaVarredura(u);
  const novos = { ...R.temas };
  const itens = [];
  const falhas = [], sumidosTodos = [];
  let lidas = 0, temasLidos = 0;
  for (let i = 0; i < faixas.length; i++) {
    const [A, B] = faixas[i];
    let lido;
    try {
      lido = await pedir(urlFaixaRep(A, B), { teto: 60000, codificacao: 'latin1', ler: lerPagina });
      if (lido.r.status !== 200) throw new Error(`HTTP ${lido.r.status}`);
    } catch (e) { falhas.push(`faixa ${A}–${B}: ${e.message}`); continue; }
    const { temas } = lido.valor;
    const fora = temas.find((t) => t.numero < A || t.numero > B);
    if (fora) { falhas.push(`faixa ${A}–${B}: veio o Tema ${fora.numero}, fora da faixa`); continue; }
    const vieram = new Set(temas.map((t) => t.numero));
    const sumidos = Object.keys(R.temas).map(Number).filter((n) => n >= A && n <= B && !vieram.has(n)).sort((a, b) => a - b);
    if (sumidos.length > lim.sumidosMax) { falhas.push(`faixa ${A}–${B}: ${sumidos.length} temas da leitura anterior não vieram (ex.: ${sumidos.slice(0, 5).join(', ')}) — leitura suspeita`); continue; }
    sumidosTodos.push(...sumidos);
    itens.push(...compararRepetitivos(R.temas, temas, { acompanhamento: acomp, quando }));
    for (const t of temas) novos[t.numero] = retratoTemaRep(t, R.temas[t.numero]);
    lidas++;
    temasLidos += temas.length;
    // A última faixa voltou cheia: há temas além dela.
    if (i === faixas.length - 1 && temas.length >= 50) faixas.push([B + 1, B + 50]);
  }
  const detalhe = `${temasLidos} temas lidos em ${lidas + falhas.length} faixa(s)${falhas.length ? `, ${falhas.length} com falha` : ''}; comparados com a leitura de ${dataDeISO(R.lidoEm)}`;
  if (!lidas) return falha('nenhuma faixa dos repetitivos pôde ser lida: ' + falhas.slice(0, 3).join('; '), detalhe);
  const erros = [...falhas];
  if (sumidosTodos.length) erros.push(`${sumidosTodos.length === 1 ? 'Tema' : 'Temas'} ${sumidosTodos.join(', ')} da leitura anterior não ${sumidosTodos.length === 1 ? 'veio' : 'vieram'} na pesquisa; ${sumidosTodos.length === 1 ? 'a entrada foi mantida' : 'as entradas foram mantidas'}`);
  const vol = travaDeVolume(itens.length, R.lidoEm, lim.volumeMax);
  if (vol) erros.push(vol);
  const nums = Object.keys(novos).map(Number);
  return {
    estado: erros.length ? 'parcial' : (itens.length ? 'novidades' : 'sem-novidade'),
    erro: erros.length ? erros.join('; ') : null,
    detalhe,
    itens,
    retrato: { lidoEm: quando, origem: ORIGEM, ultimoTema: Math.max(...nums), total: nums.length, temas: novos },
  };
}
