// scripts/sentinela.mjs — vigia das fontes oficiais do LEGIS e do JURIS.
//
// O que ele faz: lê as fontes oficiais, compara com o que o Cátedra já tem no bundle e
// escreve DUAS coisas — `novidades.js` (o que mudou, para a Central de novidades do app)
// e `sentinela/estado.json` (o diário de bordo: por fonte, a última TENTATIVA e a
// última CONSULTA BEM-SUCEDIDA, que são coisas diferentes e nunca se confundem aqui).
//
// A regra que manda em tudo: NUNCA apresentar conteúdo como atualizado quando a consulta
// falhou ou ficou pendente. Fonte que não respondeu vira `falha`, com o erro por extenso
// e o último conteúdo válido preservado — jamais "nenhuma novidade".
//
// Roda no servidor (GitHub Actions, diário) e à mão. Não roda dentro do app: o Cátedra
// funciona off-line e em file://, então quem fala com a rede é isto aqui e a função
// serverless api/sentinela.js (o botão "Buscar atualizações agora").
//
// Uso:
//   node scripts/sentinela.mjs                       # todas as fontes
//   node scripts/sentinela.mjs --fonte planalto      # só uma (planalto|stf|stj)
//   node scripts/sentinela.mjs --dry-run             # não escreve nada
//   node scripts/sentinela.mjs --json                # despeja o relatório em JSON no stdout
//   node scripts/sentinela.mjs --ja-propostos <arq>  # novidades.js de um PR fechado sem merge:
//                                                    # os ids dele não contam como novos
//   node scripts/sentinela.mjs --semente             # SEM REDE: regrava novidades.js vazio de
//                                                    # itens, com a cobertura de cada fonte e
//                                                    # resultado/datas nulos ("nunca consultada")
//   node scripts/sentinela.mjs --detectar-desde <juris-index.js de antes da incorporação>
//                                                    # (workflow) os informativos são detectados
//                                                    # a partir desse acervo; a baixa, contra o
//                                                    # juris-index.js de agora
//   node scripts/sentinela.mjs --conferir-recuo <juris-index.js do PR aberto> [--desde <da main>]
//                                                    # SEM REDE (workflow): sai 1 se o acervo de
//                                                    # agora ficou atrás do PR aberto, ou não traz
//                                                    # uma edição que ele trazia
//   node scripts/sentinela.mjs --novas-alem-de <juris-index.js do PR recusado> --desde <da main>
//                                                    # SEM REDE (workflow): última linha novas=sim
//                                                    # se a incorporação de agora trouxe edição que
//                                                    # a main e o PR recusado não tinham
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { ROOT, baixarLei } from './lib/planalto.mjs';
import { buscarFonte } from './lib/tls-fontes.mjs';

const ARGV = process.argv.slice(2);
const flag = (n) => ARGV.includes(n);
const val = (n, d) => { const i = ARGV.indexOf(n); return i >= 0 ? ARGV[i + 1] : d; };
const DRY = flag('--dry-run');
const SO_JSON = flag('--json');
const SEMENTE = flag('--semente');
// Fora de dados/: lá moram só as fatias imutáveis dos acervos (build-fatias.mjs), que o
// build publica inteiras e o service worker serve como cache-first por nome com hash.
const PASTA = join(ROOT, 'sentinela');
const ESTADO = join(PASTA, 'estado.json');
const SAIDA = join(ROOT, 'novidades.js');
const MAX_EDICOES = parseInt(val('--max-edicoes', '12'), 10);
// Prazo (epoch ms) que a função serverless passa ao rodar(): a Vercel corta a função aos 60 s
// e devolve 504 sem corpo. Abaixo desta folga, leitura nova nem começa, porque não teria como
// terminar; o que não coube volta como parcial/falha, por extenso. Sem prazo (rotina diária),
// nunca falta tempo.
const FOLGA_MS = 3000;
const semTempo = (prazo) => !!prazo && prazo - Date.now() < FOLGA_MS;

const log = (...a) => { if (!SO_JSON) console.log(...a); };
const agora = () => new Date().toISOString();
const sha = (s) => createHash('sha1').update(String(s)).digest('hex').slice(0, 16);

// ─────────────────────────────────────────────────────────────────────────────
// COBERTURA — o que este vigia realmente olha, dito por extenso.
//
// Está aqui, e não num comentário, porque o app MOSTRA esta lista: prometer "todo o
// Planalto" e conferir 14 normas seria mentir para quem estuda. O que não é monitorado
// aparece em `limites`, visível na tela, e não vira silêncio.
// ─────────────────────────────────────────────────────────────────────────────
export const COBERTURA = {
  planalto: {
    rotulo: 'Planalto — texto compilado das normas',
    monitora: 'o texto compilado das normas cadastradas no acervo de lei seca do Cátedra, artigo a artigo',
    descobreNovas: false,
    limites: [
      // Os três números saem dos arquivos do acervo e a régua (S10e) confere cada um:
      // CT_LEIS (leis-seca.js), CT_LEIS_CAT (leis-catalogo.js) e CT_LEIS_AREAS
      // (leis-seca-areas.js). As 35 das outras áreas JÁ estão entre as 254 do catálogo.
      'só as 14 normas do acervo de lei seca, listadas aqui, são conferidas artigo a artigo: as outras 254 leis do catálogo do CátedraLEGIS — entre elas as 35 leis secas das demais áreas de estudo — não são vigiadas, e mudança nelas não aparece nesta central',
      'não descobre normas novas sozinho: o índice de legislação do Planalto está atrás de escudo anti-robô (F5/TSPD) e não responde de forma confiável — norma nova entra pelo catálogo do CátedraLEGIS',
      'a data de entrada em vigor só é afirmada quando a própria página traz a anotação; fora disso o item fica como vigência não informada, pendente de conferência',
      'produção de efeitos é tratada à parte da vigência: quando a página marca "(Produção de efeito)" sem trazer a data, o item avisa que a norma produz efeitos em data própria e fica pendente de conferência',
      'revogação só é apontada quando a própria página anota "(Revogado pela…)" no caput do artigo; artigo que some do texto compilado é tratado como leitura suspeita daquela norma, não como revogação',
    ],
  },
  stf: {
    rotulo: 'STF — Informativo de Jurisprudência',
    monitora: 'edições novas do Informativo, a partir da última já presente no acervo do CátedraJURIS',
    descobreNovas: true,
    limites: [
      'cobre o Informativo, não o inteiro teor do acórdão nem a base de repercussão geral',
      'súmulas e temas de repercussão geral não são monitorados nesta versão',
    ],
  },
  stj: {
    rotulo: 'STJ — Informativo de Jurisprudência',
    monitora: 'edições novas do Informativo (ordinárias e extraordinárias), a partir da última já no acervo',
    descobreNovas: true,
    limites: [
      'cobre o Informativo, não o inteiro teor do acórdão',
      'súmulas do STJ NÃO entram neste sentinela: o SCON segue bloqueado para consulta automatizada e a rota oficial BDJur/Revista de Súmulas, usada na auditoria, ainda não foi integrada à rotina diária',
      'temas repetitivos têm rota oficial própria e não estão integrados nesta versão do sentinela',
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Base de comparação: o que o app já tem.
// ─────────────────────────────────────────────────────────────────────────────
function carregarGlobais(arquivos) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const f of arquivos) {
    const p = join(ROOT, f);
    if (existsSync(p)) vm.runInContext(readFileSync(p, 'utf8'), ctx);
  }
  return ctx.window;
}

// O acervo de lei seca pesa ~4 MB; a função serverless e a rotina leem uma vez por processo.
let _leis = null;
function leisDoAcervo() {
  if (!_leis) _leis = carregarGlobais(['leis-seca.js']).CT_LEIS || [];
  return _leis;
}
const normasDe = (leis) => (leis || []).map((l) => ({ sigla: l.sigla, nome: l.nome }));

/** As normas que o Planalto confere, por sigla e nome — a tela LISTA quais são, para o
 *  limite "só estas" ser verificável por quem estuda (E9). */
export function normasMonitoradas() {
  try { return normasDe(leisDoAcervo()); } catch (_) { return []; }
}

/** O que a fonte promete, sem resultado nenhum: rótulo, o que monitora, limites e (no
 *  Planalto) a lista de normas. É a cara de "nunca consultada" e o recuo da api em falha. */
export function coberturaDe(fonte) {
  const c = COBERTURA[fonte];
  return {
    rotulo: c.rotulo,
    monitora: c.monitora,
    limites: c.limites,
    ...(fonte === 'planalto' ? { normas: normasMonitoradas() } : {}),
  };
}

/** O novidades.js versionado antes da primeira varredura revisada (decisão da dona,
 *  01/10/2026): nenhum item, e cada fonte com a cobertura e resultado/datas NULOS — a
 *  Central diz "nunca consultada" em vez de fingir uma conferência que não houve. */
export function semente() {
  const fontes = {};
  for (const f of Object.keys(COBERTURA)) {
    fontes[f] = { ...coberturaDe(f), resultado: null, ultimaTentativa: null, ultimoSucesso: null, erro: null, detalhe: null };
  }
  return { geradoEm: null, fontes, itens: [] };
}

function lerEstado() {
  if (existsSync(ESTADO)) { try { return JSON.parse(readFileSync(ESTADO, 'utf8')); } catch (_) { /* cai no recuo */ } }
  // Sem o diário (a função serverless só leva novidades.js), o carimbo vem do próprio
  // novidades.js, que guarda as mesmas `fontes`. Sem este recuo, uma falha no botão
  // "Buscar atualizações agora" devolvia ultimoSucesso nulo e apagava da tela a última
  // consulta bem-sucedida que o app já mostrava.
  try {
    const w = carregarGlobais(['novidades.js']);
    if (w.CT_NOVIDADES && w.CT_NOVIDADES.fontes) return { fontes: w.CT_NOVIDADES.fontes };
  } catch (_) { /* sem base: começa do zero */ }
  return { fontes: {} };
}

function lerNovidadesAtuais() {
  if (!existsSync(SAIDA)) return [];
  try {
    const w = carregarGlobais(['novidades.js']);
    return (w.CT_NOVIDADES && w.CT_NOVIDADES.itens) || [];
  } catch (_) { return []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Anotações do Planalto: quem alterou, e se já vale.
//
// O texto compilado carrega a autoria da mudança grudada no dispositivo —
// "(Redação dada pela Lei nº 14.133, de 2021)", "(Incluído pela…)", "(Revogado pela…)".
// É a única prova de origem que a página oferece, e é ela que vira o campo "norma
// modificadora" do item. O marcador "(Vigência)" avisa que há regra de vigência própria,
// MAS não diz a data: por isso vigência vira `indeterminada`, não vira "em vigor".
// ─────────────────────────────────────────────────────────────────────────────
// O nome da norma termina no ")" — ou, quando o Planalto esquece de fechar o parêntese, no
// próximo "(" ou "§", ou no fim do texto. Medido no leis-seca.js em 01/10/2026: sem esse
// corte saíam como "modificadora" trechos como 'Decreto-lei nº 1.535, de 13.4.1977 § 1º - As
// férias poderão ser gozadas em 2 (dois' (CLT art. 139) e 'Medida Provisória nº 1.068, de
// 2021 (Rejeitada' (Marco Civil art. 8º-C). E o nome para na data da norma (RE_FIM_NOME):
// sem fecho nem "(" por perto, o resto do artigo ('… de 13.4.1977 SEÇÃO V DOS EFEITOS…', CLT
// art. 145) não entra no nome. Com a troca, nenhum dos 946 nomes do acervo traz "§", "(" ou
// passa de 70 caracteres (antes, 6).
const RE_MOD = /\((Reda[çc][ãa]o dada|Inclu[íi]d[oa]|Revogad[oa]|Renumerad[oa])\s+pel[ao]\s+([^()§]{4,90}?)\s*(?:\)|(?=[(§]|$))/gi;
const RE_FIM_NOME = /,?\s+de\s+(?:\d{1,2}[ºo°]?[./]\d{1,2}[./]\d{2,4}|\d{1,2}\s*[ºo°]?\s+de\s+[a-zçã]+\s+de\s+\d{4}|\d{4})(?!\d)/i;
function nomeDaNorma(s) {
  // "pela pela Emenda…" (o Planalto repete a preposição) e "de 2000:" (dois-pontos antes do
  // fecho) também aparecem no acervo.
  let x = String(s).replace(/\s+/g, ' ').trim().replace(/^pel[ao]\s+/i, '');
  const m = RE_FIM_NOME.exec(x);
  if (m) x = x.slice(0, m.index + m[0].length);
  return x.replace(/[\s:;,.]+$/, '');
}
// Vigência e produção de efeitos são coisas diferentes (o pedido exige separar publicação,
// entrada em vigor e produção de efeitos): a norma pode estar em vigor e só produzir
// efeitos depois — é o que o Planalto anota com "(Produção de efeito)", na CF e no CTN.
// Até 01/10/2026 os dois marcadores caíam na mesma regex e viravam "vigência indeterminada".
//
// A data só é DA VIGÊNCIA quando vem colada ao marcador: "(Vigência) a partir de 01/01/2027",
// "(Vigência) desde 01.01.2020". Data solta no artigo quase sempre é a da lei que deu a
// redação — "(Redação dada pela Lei nº 7.209, de 11.7.1984)". Medido em 01/10/2026 no
// leis-seca.js: 11 dos 178 artigos com "(Vigência)" têm data, as 11 da norma modificadora, e
// nenhum dos 541 marcadores traz data colada. Basta UM marcador sem data no artigo para a
// vigência ficar indeterminada.
const RE_VIG_DATA = /\(\s*Vig[êe]ncia\s*\)(?:\s*[:,–—-]?\s*(?:a partir de|desde|em)?\s*(\d{1,2})[./](\d{1,2})[./](\d{4})\b)?/gi;
const RE_EFEITOS = /\(\s*Produ[çc][ãa]o de efeitos?\b([^)]*)\)/gi;
const RE_DATA = /\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/;
const dataBR = (dm) => (dm ? `${dm[1].padStart(2, '0')}/${dm[2].padStart(2, '0')}/${dm[3]}` : null);
const isoDeBR = (s) => s.split('/').reverse().join('-');

function anotacoes(txt) {
  const mods = [];
  let m;
  RE_MOD.lastIndex = 0;
  while ((m = RE_MOD.exec(txt))) {
    const norma = nomeDaNorma(m[2]);
    // Sem o ")" de fecho, o nome só vale se chegar à data da norma: o artigo cortado no teto
    // às vezes acaba no meio da anotação ("… (Redação dada pela Emenda"), e "Emenda" não é
    // nome de norma nenhuma.
    if (!m[0].endsWith(')') && !RE_FIM_NOME.test(norma)) continue;
    mods.push({ acao: m[1].toLowerCase(), norma });
  }
  // A data de produção de efeitos só vale quando vem DENTRO do próprio marcador
  // ("(Produção de efeitos a partir de 01/01/2027)"); e ela sai do texto antes de procurar
  // a data da vigência, para uma não ser lida como a outra.
  const efeitos = [];
  RE_EFEITOS.lastIndex = 0;
  while ((m = RE_EFEITOS.exec(txt))) efeitos.push(dataBR(RE_DATA.exec(m[1] || '')));
  const semEfeitos = String(txt).replace(RE_EFEITOS, ' ');
  const datasVig = [];
  RE_VIG_DATA.lastIndex = 0;
  while ((m = RE_VIG_DATA.exec(semEfeitos))) datasVig.push(m[1] ? dataBR(m) : null);
  return {
    modificadoras: mods,
    temMarcadorVigencia: datasVig.length > 0,
    // Com mais de um marcador, todos datados: vale a data mais distante (o artigo só está
    // inteiro em vigor quando a última parte entra).
    dataNoTexto: datasVig.length && datasVig.every(Boolean)
      ? datasVig.reduce((a, b) => (isoDeBR(b) > isoDeBR(a) ? b : a)) : null,
    temMarcadorEfeitos: efeitos.length > 0,
    dataEfeitos: efeitos.find(Boolean) || null,
  };
}

export function modificadorasDaDiferenca(antes, depois) {
  const velhas = new Map();
  for (const m of anotacoes(antes || '').modificadoras) {
    const k = m.acao + '|' + m.norma;
    velhas.set(k, (velhas.get(k) || 0) + 1);
  }
  const novas = [];
  for (const m of anotacoes(depois || '').modificadoras) {
    const k = m.acao + '|' + m.norma;
    const qtd = velhas.get(k) || 0;
    if (qtd > 0) velhas.set(k, qtd - 1);
    else novas.push(m);
  }
  return novas;
}

/** Classifica o dispositivo em vigor / aguardando vigência / indeterminada.
 *  Conservador de propósito: só afirma "aguardando vigência" quando a página diz que há
 *  regra de vigência própria E a data que ela traz ainda não chegou. Sem os dois, o item
 *  sai como `indeterminada` e cai na fila de revisão — um "já vale" errado faz a pessoa
 *  estudar regra que ainda não se aplica. */
export function classificarVigencia(txt, hoje = new Date()) {
  const a = anotacoes(txt);
  // Produção de efeitos (E10): campo próprio, que NÃO mexe na vigência. Com o marcador e
  // sem data, `efeitos` avisa e `efeitosEm` fica nulo — o item vai para conferência.
  const ef = { efeitos: a.temMarcadorEfeitos ? 'marcador-proprio' : null, efeitosEm: a.temMarcadorEfeitos ? a.dataEfeitos : null };
  if (!a.temMarcadorVigencia) return { vigencia: 'em-vigor', vigenciaEm: null, motivo: 'texto compilado sem marcador de vigência própria', ...ef };
  if (a.dataNoTexto) {
    const [d, mo, y] = a.dataNoTexto.split('/').map(Number);
    const dt = new Date(y, mo - 1, d);
    if (dt > hoje) return { vigencia: 'aguardando', vigenciaEm: a.dataNoTexto, motivo: 'a página traz marcador de vigência e data futura', ...ef };
    return { vigencia: 'em-vigor', vigenciaEm: a.dataNoTexto, motivo: 'marcador de vigência com data já alcançada', ...ef };
  }
  return { vigencia: 'indeterminada', vigenciaEm: null, motivo: 'a página marca vigência própria mas não informa a data — conferir na fonte', ...ef };
}

// ── Diferença que importa × diferença de aparência ──────────────────────────
//
// Duas armadilhas reais, as duas medidas em 15/09/2026 contra o acervo de 20/08:
//
// 1) ANOTAÇÃO DE MARGEM. O Planalto pendura rótulos de link soltos no meio do artigo
//    ("Regulamento", "Vigência"), que não são texto de lei. O art. 77 da Lei 14.133 foi
//    acusado de "alteração" quando a única diferença era ter ganhado essas duas palavras.
//    Elas saem do texto COMPARADO — mas o "(Vigência)" entre parênteses fica, porque é
//    dele que sai a classificação de vigência. api/law.js já descarta as mesmas linhas.
//
// 2) REMISSÃO LIDA COMO ARTIGO. O parser corta em "Art. N", e sem querer corta também na
//    remissão "art. 927 da Lei nº 13.105" no meio de outro dispositivo — inventando um
//    "art. 927" no CTN (que tem 108 artigos) e um "art. 105" no CPC. O Planalto escreve
//    o CABEÇALHO sempre em "Art." e a remissão em "art.": o rótulo minúsculo é descartado
//    dos dois lados da comparação. (O acervo leis-seca.js carrega os mesmos fantasmas;
//    não são consertados aqui para não mudar o bundle de raspão — ficam anotados.)
const RE_MARGEM = /\s(?:Regulamento|Vig[êe]ncia|Produ[çc][ãa]o de efeitos?)(?=\s)/g;
const chaveArt = (rot) => String(rot).toLowerCase().replace(/[^a-z0-9]/g, '');
const normalizar = (t) => String(t).replace(/\s+/g, ' ').trim();
const textoComparavel = (t) => normalizar(String(t).replace(RE_MARGEM, ' '));

// 3) ARTIGO CORTADO NO TETO. O acervo guarda cada artigo com no máximo 4.000 caracteres
//    (teto de tamanho do bundle, em scripts/lib/planalto.mjs). Num artigo que bate no
//    teto, ganhar 22 caracteres no meio empurra a cauda para fora — e as duas versões
//    passam a diferir no fim mesmo sem nenhuma mudança de lei. Foi o que acusou o art. 77
//    da Lei 14.133. Nesses casos compara-se só o trecho que os DOIS lados têm, e o item
//    sai marcado como comparação parcial — nunca como "conferido por inteiro".
const TETO = 3990;
const noTeto = (t) => String(t).length >= TETO;
function difereNoTrechoComum(a, b) {
  const x = textoComparavel(a), y = textoComparavel(b);
  if (!noTeto(a) && !noTeto(b)) return { difere: x !== y, parcial: false };
  const n = Math.max(0, Math.min(x.length, y.length) - 64);
  return { difere: x.slice(0, n) !== y.slice(0, n), parcial: true };
}
// 4) TRECHO COM MAIS DE UM ARTIGO. Onde rótulo e corpo caem em células separadas (CTN,
//    Lei 14.133), o parser corrido junta vários artigos num trecho só, e uma INCLUSÃO no
//    meio (ex.: art. 211-A) muda o fim do trecho vizinho sem que o artigo dele mude. Medido
//    na varredura de 15/09/2026: arts. 111, 120, 195 e 211 do CTN saíram como "alteração"
//    com o texto do próprio artigo idêntico. O item continua (a mudança pode estar num
//    artigo embutido), mas sai marcado como recorte e vai para revisão.
//    O corte é no cabeçalho de OUTRO número. O Planalto mantém a redação antiga (riscada) e,
//    logo depois, a nova com o MESMO cabeçalho — CF art. 101: "Art. 101. … menos de sessenta
//    e cinco anos … Art. 101. … menos de setenta anos … (Redação dada pela EC nº 122, de 2022)".
//    Medido em 01/10/2026: o texto próprio muda em 6 artigos do leis-seca.js (CF 76, 101, 107,
//    111-A, 115 e 169) e em 15 do leis-seca-areas.js, todos com o cabeçalho repetido. Cortar
//    no segundo "Art. 101" deixava só a redação riscada como texto próprio, e uma mudança real
//    na redação em vigor saía como "recorte" ("o texto deste artigo não mudou"), sem autoria.
const RE_CAB_INTERNO = /(?:[.;:!?)]\s+|\s{2,})(Art(?:igo)?\.?\s*\d+[ºª°]?(?:-[A-Z])?)\s*[.\-–—]?\s+(?=[A-ZÀ-Ú§])/g;
const numeroDoArt = (s) => {
  const m = /^Art(?:igo)?\.?\s*(\d+(?:\.\d{3})*)\s*[ºª°]?(?:-([A-Z])(?![a-zà-ú]))?/.exec(String(s).trim());
  return m ? m[1] + (m[2] ? '-' + m[2] : '') : null;
};
export function textoProprio(t) {
  const x = textoComparavel(t || '');
  const proprio = numeroDoArt(x);
  RE_CAB_INTERNO.lastIndex = 0;
  let m;
  while ((m = RE_CAB_INTERNO.exec(x))) {
    if (proprio && numeroDoArt(m[1]) === proprio) continue;   // a outra redação do mesmo artigo
    return x.slice(0, m.index + m[0].indexOf(m[1])).trim();
  }
  return x;
}

// 6) REVOGAÇÃO NO TEXTO COMPILADO. O Planalto NÃO apaga o artigo revogado: mantém o texto
//    (riscado no HTML, corrido aqui) e acrescenta "(Revogado pela Lei nº …)". Medido no
//    acervo de 01/10/2026: 321 dos 6.790 artigos carregam a anotação, e em 152 ela fecha o
//    caput (CF arts. 117, 171 e 233…). Por isso revogação NOVA chega como diferença de texto,
//    e quem diz que é revogação é a anotação — no CAPUT (antes do primeiro parágrafo ou
//    inciso): revogação só de parágrafo ou inciso continua sendo alteração do artigo.
const RE_FIM_CAPUT = /\s(?:§\s*\d|Par[áa]grafo\s+[úu]nico|[IVXLC]+\s*[-–—]\s)/;
const RE_CAPUT_REVOGADO = /\(Revogad[oa]\s+pel[ao]\s[^)]*\)(?:\s*\([^)]*\))*\s*$/i;
export function caputDe(t) {
  const x = textoProprio(t);
  const m = RE_FIM_CAPUT.exec(x);
  return m ? x.slice(0, m.index).trim() : x;
}
function caputRevogadoAgora(antes, depois) {
  const cd = caputDe(depois);
  return RE_CAPUT_REVOGADO.test(cd)
    && modificadorasDaDiferenca(caputDe(antes), cd).some((m) => /^revogad/.test(m.acao));
}

// O id do item é a identidade da MUDANÇA JURÍDICA, não da aparência da página: sai do texto
// comparável (sem rótulo de margem, espaços normalizados). Sobre o texto cru, a página que
// ganhasse "Regulamento" num artigo já alterado fazia nascer um SEGUNDO item para a mesma
// mudança — contado como novidade nova e reabrindo o PR. No artigo cortado no teto (3),
// a cauda oscila sozinha: a identidade usa só o começo, que as duas leituras compartilham.
const chaveTexto = (t, parcial) => { const x = textoComparavel(t || ''); return parcial ? x.slice(0, TETO - 200) : x; };

/** Monta o item de UMA diferença do Planalto. Pura (sem rede), para a régua testar. */
export function itemPlanalto(lei, d, quando, hoje = new Date()) {
  const base = d.depois || d.antes || '';
  const v = d.depois == null
    ? { vigencia: 'em-vigor', vigenciaEm: null, motivo: 'dispositivo ausente do texto compilado', efeitos: null, efeitosEm: null }
    : classificarVigencia(base, hoje);
  // Efeitos em data própria SEM a data na página é informação inconclusiva: vai para revisão.
  const efeitosSemData = v.efeitos === 'marcador-proprio' && !v.efeitosEm;
  const soRecorte = d.tipo === 'alteracao' && textoProprio(d.antes) === textoProprio(d.depois);
  // Autoria: só a anotação que a DIFERENÇA trouxe ao TEXTO PRÓPRIO do artigo. Sem anotação
  // nova, nenhuma norma é apontada — a anotação antiga do artigo atribuiria a mudança à lei
  // errada; e a anotação nova de um artigo VIZINHO embutido no mesmo trecho (recorte, 4)
  // atribuiria a este artigo uma mudança que não é dele.
  const novas = soRecorte ? [] : modificadorasDaDiferenca(textoProprio(d.antes), textoProprio(d.depois));
  const tipo = d.tipo === 'alteracao' && caputRevogadoAgora(d.antes, d.depois) ? 'revogacao' : d.tipo;
  return {
    id: 'PLN-' + lei.sigla.replace(/\W+/g, '') + '-' + chaveArt(d.rot) + '-'
      + sha(chaveTexto(d.depois, d.parcial) + '\n' + chaveTexto(d.antes, d.parcial)),
    fonte: 'planalto',
    fonteRotulo: COBERTURA.planalto.rotulo,
    tipo,
    norma: lei.sigla,
    normaNome: lei.nome,
    disp: d.rot,
    titulo: `${d.rot} — ${lei.sigla}`,
    antes: d.antes,
    depois: d.depois,
    modificadora: novas.length ? novas[novas.length - 1].norma : null,
    modificadoras: novas,
    vigencia: v.vigencia,
    vigenciaEm: v.vigenciaEm,
    vigenciaMotivo: v.motivo,
    efeitos: v.efeitos,
    efeitosEm: v.efeitosEm,
    parcial: !!d.parcial,
    recorte: soRecorte,
    ...(soRecorte ? { pendencia: 'o texto deste artigo não mudou: a diferença está em outro artigo que o acervo guarda no mesmo trecho — conferir na fonte' } : {}),
    revisar: v.vigencia === 'indeterminada' || !!d.parcial || soRecorte || !novas.length || efeitosSemData,
    urlOficial: lei.url,
    detectadoEm: quando,
    lido: false,
  };
}
const ehCabecalho = (rot) => /^Art/.test(String(rot).trim());
const soArtigosDeVerdade = (arts) => arts.filter((a) => ehCabecalho(a.rot));

// 5) PÁGINA LIDA PELA METADE. O piso de baixarLei (20 artigos) é absoluto: uma CF que
//    viesse com 300 dos 560 artigos passaria por ele e deixaria ~260 artigos "ausentes". A trava
//    relativa compara com o próprio acervo — menos de 80% dos artigos esperados é parse
//    suspeito, e a norma sai como FALHA daquela leitura, com o último conteúdo válido intacto.
export const PISO_PARSE = 0.8;
export function parseSuspeito(esperados, obtidos) {
  const y = soArtigosDeVerdade(esperados || []).length;
  const x = soArtigosDeVerdade(obtidos || []).length;
  return y && x < PISO_PARSE * y ? `parse suspeito: ${x} de ${y} artigos` : null;
}

/** Compara dois conjuntos de artigos e devolve as diferenças. Artigo do acervo que não
 *  aparece na leitura sai como `ausente`, NÃO como revogação: o Planalto mantém o artigo
 *  revogado no texto compilado (6), então o que some é indício de leitura ruim — quem
 *  chama decide (consultarPlanalto trata como falha da leitura daquela norma). */
export function compararArtigos(antes, depois) {
  const A = new Map(soArtigosDeVerdade(antes).map((a) => [chaveArt(a.rot), a]));
  const D = new Map(soArtigosDeVerdade(depois).map((a) => [chaveArt(a.rot), a]));
  const out = [];
  for (const [k, novo] of D) {
    const velho = A.get(k);
    // `antes`/`depois` guardam o texto como a fonte o escreve (é o que a pessoa lê na
    // comparação); quem decide SE mudou é a versão sem anotação de margem.
    if (!velho) { out.push({ tipo: 'inclusao', rot: novo.rot, antes: null, depois: normalizar(novo.txt) }); continue; }
    const cmp = difereNoTrechoComum(velho.txt, novo.txt);
    if (cmp.difere) {
      out.push({ tipo: 'alteracao', rot: novo.rot, antes: normalizar(velho.txt), depois: normalizar(novo.txt), parcial: cmp.parcial });
    }
  }
  for (const [k, velho] of A) {
    if (!D.has(k)) out.push({ tipo: 'ausente', rot: velho.rot, antes: normalizar(velho.txt), depois: null });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonte 1 — Planalto
// ─────────────────────────────────────────────────────────────────────────────
async function consultarPlanalto(LEIS, baixar = baixarLei, prazo = 0) {
  if (!LEIS.length) return { estado: 'falha', erro: 'leis-seca.js vazio ou ausente — sem base de comparação', itens: [], detalhe: '' };

  const itens = [];
  // Normas lidas por inteiro e comparadas sem divergência: só nelas a AUSÊNCIA de uma
  // diferença conhecida diz alguma coisa (mesclarNovidades usa isto para dar baixa no PLN-*).
  const conferidas = [];
  let lidas = 0;
  const falhas = [];
  for (const [i, lei] of LEIS.entries()) {
    if (semTempo(prazo)) { falhas.push('tempo da consulta esgotado antes de ler: ' + LEIS.slice(i).map((l) => l.sigla).join(', ')); break; }
    try {
      const arts = await baixar(lei.url, { prazo });
      const susp = parseSuspeito(lei.artigos, arts);
      if (susp) { falhas.push(`${lei.sigla}: ${susp}`); continue; }
      const difs = compararArtigos(lei.artigos, arts);
      // Artigo que SUMIU não é revogação (o Planalto mantém o revogado, com a anotação — 6):
      // é leitura suspeita, abaixo do piso relativo de 5). A norma inteira fica como falha
      // desta leitura, com o último conteúdo válido intacto, em vez de N "revogações".
      const sumiram = difs.filter((d) => d.tipo === 'ausente');
      if (sumiram.length) {
        const quais = sumiram.slice(0, 5).map((d) => d.rot).join(', ') + (sumiram.length > 5 ? '…' : '');
        falhas.push(`${lei.sigla}: ${sumiram.length} artigo(s) do acervo sumiram da página (${quais}) — o Planalto mantém o artigo revogado no texto compilado, com a anotação, então isto é leitura suspeita; nada registrado`);
        continue;
      }
      if (difs.length) {
        // CONFERÊNCIA DE ORIGEM: a página do Planalto já devolveu conteúdo oscilante numa
        // leitura isolada (visto em 15/09/2026, na Lei Maria da Penha). Diferença só vira
        // novidade se a SEGUNDA leitura repetir exatamente a mesma diferença.
        if (semTempo(prazo)) { falhas.push(`${lei.sigla}: diferença encontrada, mas o tempo acabou antes da segunda leitura que a confirma — nada registrado`); continue; }
        const arts2 = await baixar(lei.url, { prazo });
        const susp2 = parseSuspeito(lei.artigos, arts2);
        if (susp2) { falhas.push(`${lei.sigla}: ${susp2} (segunda leitura)`); continue; }
        const difs2 = compararArtigos(lei.artigos, arts2);
        const assina = (d) => d.map((x) => x.tipo + '|' + chaveArt(x.rot) + '|' + sha(chaveTexto(x.depois, x.parcial))).sort().join(';');
        if (assina(difs) !== assina(difs2)) {
          // Divergência NÃO conta como norma lida: nada foi confirmado. Se todas divergirem,
          // a fonte sai como falha e o último sucesso fica onde estava.
          falhas.push(`${lei.sigla}: leituras divergentes entre si — não confirmado, nada registrado`);
          continue;
        }
        for (const d of difs) itens.push(itemPlanalto(lei, d, agora()));
      }
      conferidas.push(lei.sigla);
      lidas++;
    } catch (e) {
      // Estrutura da fonte mudou ou a rede caiu: registra a falha e PRESERVA o último
      // conteúdo válido (que continua sendo o do bundle). Nada é apagado, nada é inventado.
      falhas.push(`${lei.sigla}: ${e.message}`);
    }
  }

  if (!lidas) return { estado: 'falha', erro: 'nenhuma norma pôde ser lida e confirmada: ' + falhas.slice(0, 3).join('; '), itens: [], detalhe: `0/${LEIS.length} normas lidas`, conferidas };
  const parcial = falhas.length > 0;
  return {
    estado: parcial ? 'parcial' : (itens.length ? 'novidades' : 'sem-novidade'),
    erro: parcial ? falhas.join('; ') : null,
    detalhe: `${lidas}/${LEIS.length} normas lidas`,
    itens,
    conferidas,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fontes 2 e 3 — Informativos do STF e do STJ
//
// Detecção só: o vigia descobre que a edição N+1 existe e a registra como novidade. Quem
// PARSEIA e incorpora ao acervo é scripts/atualizar-informativos.py, que já faz isso há
// tempo e é o dono desse formato. Dois parsers do mesmo HTML seria pedir divergência.
// ─────────────────────────────────────────────────────────────────────────────
let _ult = null;   // juris-index.js não muda durante o processo (rotina ou instância serverless)
export function ultimasEdicoes() {
  if (_ult) return _ult;
  _ult = lerUltimasEdicoes();
  return _ult;
}
function lerUltimasEdicoes() {
  return ultimasDoIndice(carregarGlobais(['juris-index.js']).__JURIS_IDX__ || []);
}
/** As últimas edições de um juris-index.js QUALQUER (o do PR aberto, o de antes da
 *  incorporação). Lança se o arquivo não puder ser lido: quem chama decide, e o workflow
 *  prefere parar a comparar contra um acervo vazio. */
export function ultimasDeArquivo(caminho) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(caminho, 'utf8'), ctx);
  const IDX = ctx.window.__JURIS_IDX__;
  if (!Array.isArray(IDX) || !IDX.length) throw new Error(`${caminho} não define window.__JURIS_IDX__ com verbetes`);
  return ultimasDoIndice(IDX);
}
const RE_ID_EE = /^INF\d{4}-STJ-EE(\d+)-/;
export function ultimasDoIndice(IDX) {
  // Sem teto, nos dois — como o scripts/atualizar-informativos.py desde o PR #176, que
  // largou o antigo corte `nu < 900`. As extraordinárias do acervo usam `nu` de 28 a 33
  // (conferido em 15/09/2026) e se distinguem pelo id `-EE<n>-`, não pelo número. Um teto
  // fazia o vigia reanunciar a edição 900, que já estava no bundle, e aplicado ao STF
  // travava a busca na 862. Por isso a extraordinária sai da série das ordinárias pelo id.
  const ord = (fo) => IDX.filter((r) => r[2] === fo && typeof r[3] === 'number' && !RE_ID_EE.test(String(r[0]))).map((r) => r[3]);
  const stf = ord('informativo_stf'), stj = ord('informativo_stj');
  const ee = IDX.map((r) => RE_ID_EE.exec(String(r[0]))).filter(Boolean).map((m) => +m[1]);
  const unicas = (xs) => [...new Set(xs)].sort((a, b) => a - b);
  return {
    stf: stf.length ? Math.max(...stf) : null,
    stj: stj.length ? Math.max(...stj) : null,
    stjExtra: ee.length ? Math.max(...ee) : 27,
    // QUAIS edições estão no acervo, série por série — não só a última. O
    // atualizar-informativos.py tolera lacuna: uma edição que não respondeu ("nada") seguida
    // de uma que respondeu não encerra o laço dele, e o acervo pode sair com a 901 e a 903 sem
    // a 902. Pelo número máximo, a 902 passaria por "já no JURIS" e a trava de recuo não
    // veria que ela sumiu.
    presentes: { stf: unicas(stf), stj: unicas(stj), stjExtra: unicas(ee) },
  };
}

const SERIES = { stf: 'STF', stj: 'STJ', stjExtra: 'STJ, extraordinárias' };
const listaEdicoes = (ns) => (ns.length > 1 ? `as edições ${ns.slice(0, -1).join(', ')} e ${ns[ns.length - 1]}` : `a edição ${ns[0]}`);

/** Guarda do workflow: a incorporação desta rodada ficou ATRÁS do PR aberto? O PR é refeito a
 *  partir da main a cada rodada; se a página do tribunal não respondeu hoje, o acervo
 *  incorporado sai menor que o de ontem e atualizar o PR tiraria dele julgados já propostos
 *  (vazio nunca apaga cheio). Acusa a última edição que recuou E qualquer edição do PR que
 *  esta rodada não traz (lacuna no meio: o PR com 901, 902 e 903, hoje 901 e 903).
 *  `antes` (opcional) = o acervo da main, de antes da incorporação: edição do PR igual ou
 *  abaixo da última da main é assunto da main (uma auditoria que tirou a edição de lá), não
 *  recuo desta rodada. Devolve a frase do que recuou, ou null. Pura, para a régua. */
export function recuoDoAcervo(doPR, aqui, antes) {
  const recuos = [];
  for (const k of Object.keys(SERIES)) {
    const p = (doPR || {})[k], a = (aqui || {})[k];
    if (typeof p !== 'number') continue;
    if (!(typeof a === 'number' && a >= p)) { recuos.push(`${SERIES[k]}: o PR aberto vai até a edição ${p}, esta rodada só até a ${a ?? 'nenhuma'}`); continue; }
    const doPr = doPR.presentes && doPR.presentes[k], daqui = aqui.presentes && aqui.presentes[k];
    if (!Array.isArray(doPr) || !Array.isArray(daqui)) continue;   // sem a lista, só o máximo
    const piso = antes && typeof antes[k] === 'number' ? antes[k] : -Infinity;
    const tem = new Set(daqui);
    const faltam = doPr.filter((n) => n > piso && !tem.has(n));
    if (faltam.length) recuos.push(`${SERIES[k]}: o PR aberto traz ${listaEdicoes(faltam)}, que esta rodada não trouxe`);
  }
  return recuos.length ? recuos.join('; ') : null;
}

/** Guarda do workflow quando a referência é o PR que a dona fechou SEM mesclar: quais edições
 *  a incorporação DESTA rodada trouxe (estão no acervo de agora e não no da main, `antes`) que
 *  o PR recusado não tinha? Só elas são novidade de verdade. Acervo diferente do recusado não
 *  basta: a rodada sem rede (acervo = main) ou a que trouxe MENOS que o recusado também
 *  diferem dele, e reabririam um PR só com o que a dona já recusou. Pura, para a régua. */
export function edicoesNovasAlem(antes, aqui, recusado) {
  const out = [];
  for (const k of Object.keys(SERIES)) {
    const de = (x) => new Set(((x && x.presentes) || {})[k] || []);
    const daMain = de(antes), doRecusado = de(recusado);
    for (const n of ((aqui && aqui.presentes) || {})[k] || []) {
      if (!daMain.has(n) && !doRecusado.has(n)) out.push(`${k === 'stjExtra' ? 'STJ extraordinária' : SERIES[k]} ${n}`);
    }
  }
  return out;
}

async function buscar(url, { timeoutMs = 40000, prazo = 0 } = {}) {
  const r = await buscarFonte(url, { timeoutMs, prazo });
  return { status: r.status, tam: r.buffer.length, texto: r.buffer.toString('latin1') };
}

// Uma edição existe quando a página responde 200 E o <title> traz o NÚMERO PEDIDO. Medido
// nas páginas oficiais em 01/10/2026 (os títulos e status estão em
// tests/fixtures/informativos/manifesto.json):
//
//  • STJ, edição real: "STJ - Informativo de Jurisprudência n. 901 - 15 de setembro de 2026.";
//    extraordinária: "… Edição Extraordinária n. 29 - 20 de janeiro de 2026". Edição que não
//    saiu (904, 7777, EE34): HTTP 200 com a página de busca vazia e o título GENÉRICO
//    "STJ - Informativo de Jurisprudência", sem número. Tamanho não distingue (a 903 real
//    tem 256.091 B; a vazia, 257.742 B), e os marcadores do corpo que a régua antiga
//    procurava ("EDIÇÃO N.", "N registro") faltam na 901 e na 903 reais — a 902 só passava
//    por acaso, por um "%20registro" de URL.
//  • STF, edição real: "Brasília, 24 de agosto de 2026 Nº 1225"; edição que não saiu: 404.
//
// A régua devolve TRÊS respostas: 'existe', 'nao-existe' e 'falha'. Status fora do combinado
// (503, 403 do escudo, 500) ou página que não é a do Informativo é FALHA daquela edição —
// nunca "edição vazia", que faria a fonte sair "sem novidade" e o último sucesso andar.
const tituloDe = (texto) => {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(String(texto || ''));
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
};
// A página é lida em latin1 (o STJ declara ISO-8859-1). Se um dia vier em UTF-8, cada letra
// acentuada vira dois caracteres — os \S{…} aceitam as duas leituras.
const RE_TIT_STJ = 'Informativo de Jurisprud\\S{1,2}ncia';
const RE_TIT_EXTRA = 'Edi\\S{2,4}o\\s+Extraordin\\S{1,2}ria';
const reNumero = (n) => `0*${Number(n)}(?!\\d)`;

export function edicaoNaPagina(fonte, r, n, extra = false) {
  const status = r && r.status;
  const titulo = tituloDe(r && r.texto);
  if (fonte === 'stf') {
    if (status === 404) return { estado: 'nao-existe' };
    if (status !== 200) return { estado: 'falha', motivo: `HTTP ${status}` };
    const re = new RegExp(`\\bN(?:º|°|o|\\.º|\\.°|Âº|Â°)?\\s*${reNumero(n)}`);
    return titulo && re.test(titulo)
      ? { estado: 'existe', titulo }
      : { estado: 'falha', motivo: 'a página respondeu 200 sem o número da edição no título' };
  }
  if (status !== 200) return { estado: 'falha', motivo: `HTTP ${status}` };
  if (!titulo || !new RegExp(RE_TIT_STJ, 'i').test(titulo)) return { estado: 'falha', motivo: 'a página não traz o título do Informativo do STJ' };
  const re = new RegExp(`${extra ? RE_TIT_EXTRA : RE_TIT_STJ}\\s+n(?:\\.|º|°)?\\s*${reNumero(n)}`, 'i');
  return re.test(titulo) ? { estado: 'existe', titulo } : { estado: 'nao-existe' };
}

const urlEdicao = (fonte, n, extra) => (fonte === 'stf'
  ? `https://www.stf.jus.br/arquivo/informativo/documento/informativo${n}.htm`
  : `https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisarumaedicao&livre=%27${String(n).padStart(4, '0')}${extra ? 'E' : ''}%27.cod.`);
const nomeEdicao = (n, extra) => (extra ? `extraordinária ${n}` : String(n));
// O que o informativo detectado e ainda fora do acervo diz a quem estuda. Também é a
// pendência que volta quando uma baixa é desfeita (mesclarNovidades).
const PENDENCIA_INF = 'edição detectada na fonte oficial; o conteúdo ainda não está no CátedraJURIS — entra na próxima atualização do acervo, depois de revisão';

async function consultarInformativos(fonte, ult, buscarPagina = buscar, prazo = 0) {
  const base = fonte === 'stf' ? ult.stf : ult.stj;
  if (base == null) return { estado: 'falha', erro: 'não foi possível ler a última edição no acervo (juris-index.js)', itens: [], detalhe: '' };
  // Duas séries no STJ, cada uma com o próprio fim: as extraordinárias não podem depender de
  // onde as ordinárias acabaram (antes um `break` único as deixava sem consulta nenhuma).
  const series = [{ extra: false, ultima: base, max: MAX_EDICOES }];
  if (fonte === 'stj') {
    if (ult.stjExtra == null) return { estado: 'falha', erro: 'não foi possível ler a última edição extraordinária no acervo (juris-index.js)', itens: [], detalhe: '' };
    series.push({ extra: true, ultima: ult.stjExtra, max: 3 });
  }

  // ÂNCORA: antes de concluir qualquer coisa, a ÚLTIMA edição que já está no acervo tem de
  // ser reconhecida pela mesma régua. Se a página mudar de formato, nenhuma edição nova seria
  // reconhecida e a fonte sairia "sem novidade" — a âncora transforma isso em falha.
  let consultadas = 0;
  for (const s of series) {
    const nome = nomeEdicao(s.ultima, s.extra);
    if (semTempo(prazo)) return { estado: 'falha', erro: `tempo da consulta esgotado antes de conferir a edição ${nome}, já no acervo — a fonte não chegou a ser lida`, itens: [], detalhe: '' };
    let r;
    try { r = await buscarPagina(urlEdicao(fonte, s.ultima, s.extra), { prazo }); consultadas++; } catch (e) {
      return { estado: 'falha', erro: `a fonte não respondeu à edição ${nome}, que já está no acervo: ${e.message}`, itens: [], detalhe: '' };
    }
    if (r.status !== 200) return { estado: 'falha', erro: `a fonte respondeu HTTP ${r.status} à edição ${nome}, que já está no acervo — não foi possível conferir a régua`, itens: [], detalhe: '' };
    if (edicaoNaPagina(fonte, r, s.ultima, s.extra).estado !== 'existe') {
      return { estado: 'falha', erro: `a régua não reconheceu a edição ${nome}, que já está no acervo: a página mudou de formato`, itens: [], detalhe: '' };
    }
  }

  const itens = [];
  const falhas = [];
  let conclusivas = 0, acabouTempo = false;
  for (const s of series) {
    let seguidasVazias = 0, seguidasFalhas = 0;
    for (let n = s.ultima + 1; n <= s.ultima + s.max && !acabouTempo; n++) {
      // Duas ordinárias em branco = chegamos no fim. As extraordinárias são poucas e
      // irregulares: as três seguintes são sempre consultadas.
      if (!s.extra && seguidasVazias >= 2) break;
      if (seguidasFalhas >= 3) { falhas.push(`${s.extra ? 'extraordinárias' : 'ordinárias'}: consulta interrompida depois de 3 falhas seguidas`); break; }
      if (semTempo(prazo)) { falhas.push(`tempo da consulta esgotado antes da edição ${nomeEdicao(n, s.extra)}`); acabouTempo = true; break; }
      const alvo = { n, extra: s.extra, url: urlEdicao(fonte, n, s.extra),
        rotulo: s.extra ? `Informativo Extraordinário ${n} do STJ` : `Informativo ${n} do ${fonte.toUpperCase()}` };
      let r;
      try { r = await buscarPagina(alvo.url, { prazo }); consultadas++; } catch (e) {
        falhas.push(`edição ${nomeEdicao(n, s.extra)}: ${e.message}`); seguidasFalhas++; continue;
      }
      const v = edicaoNaPagina(fonte, r, n, s.extra);
      if (v.estado === 'falha') { falhas.push(`edição ${nomeEdicao(n, s.extra)}: ${v.motivo}`); seguidasFalhas++; continue; }
      seguidasFalhas = 0;
      conclusivas++;
      if (v.estado === 'existe') {
        seguidasVazias = 0;
        itens.push({
          id: `INF-${fonte.toUpperCase()}-${alvo.extra ? 'EE' : ''}${alvo.n}`,
          fonte,
          fonteRotulo: COBERTURA[fonte].rotulo,
          tipo: 'informativo',
          norma: fonte.toUpperCase(),
          normaNome: COBERTURA[fonte].rotulo,
          disp: alvo.rotulo,
          titulo: alvo.rotulo,
          antes: null,
          depois: null,
          modificadora: null,
          modificadoras: [],
          vigencia: 'em-vigor',
          vigenciaEm: null,
          vigenciaMotivo: 'informativo publicado',
          efeitos: null,
          efeitosEm: null,
          // Julgado novo NÃO significa entendimento superado: a classificação de
          // superação/divergência é feita pelo build do acervo (build-semana-juris.mjs),
          // sobre o texto já incorporado, e não por data. Aqui o item nasce pendente.
          revisar: true,
          // Frase para quem estuda (a tela mostra). Quem incorpora é
          // scripts/atualizar-informativos.py (no workflow do sentinela, antes desta
          // detecção), e então mesclarNovidades dá a baixa.
          pendencia: PENDENCIA_INF,
          urlOficial: alvo.url,
          detectadoEm: agora(),
          lido: false,
        });
      } else seguidasVazias++;
    }
  }

  const detalhe = `a partir da edição ${base + 1}` + (fonte === 'stj' ? ` e da extraordinária ${ult.stjExtra + 1}` : '')
    + `; ${consultadas} páginas consultadas, contando a conferência da última edição do acervo`;
  // Nenhuma edição nova teve resposta conclusiva (existe / não existe): nada se sabe sobre
  // edições novas, e isso é falha — não "sem novidade".
  if (!conclusivas) return { estado: 'falha', erro: 'nenhuma edição nova pôde ser conferida: ' + falhas.slice(0, 3).join('; '), itens: [], detalhe };
  return {
    estado: falhas.length ? 'parcial' : (itens.length ? 'novidades' : 'sem-novidade'),
    erro: falhas.length ? falhas.join('; ') : null,
    detalhe,
    itens,
  };
}

/** Carimba o diário de bordo de uma fonte. É aqui que mora a regra central do pedido:
 *  `ultimaTentativa` anda sempre; `ultimoSucesso` SÓ anda quando a consulta deu certo.
 *  Fonte que falhou guarda o carimbo antigo — assim a tela diz "o que você vê é de
 *  anteontem" em vez de fingir que acabou de conferir, e "não consegui consultar" nunca
 *  se disfarça de "nenhuma novidade". Função à parte para poder ser testada sem rede. */
export function carimbar(fonte, anterior, r, tentativaEm) {
  const okAgora = r.estado !== 'falha';
  return {
    rotulo: COBERTURA[fonte].rotulo,
    monitora: COBERTURA[fonte].monitora,
    limites: COBERTURA[fonte].limites,
    // E9: no Planalto, QUAIS normas são conferidas — o limite "só estas 14" fica verificável.
    ...(fonte === 'planalto' ? { normas: r.normas || anterior.normas || [] } : {}),
    ultimaTentativa: tentativaEm,
    ultimoSucesso: okAgora ? tentativaEm : (anterior.ultimoSucesso || null),
    resultado: r.estado,
    erro: r.erro || null,
    detalhe: r.detalhe || '',
    novidadesNaConsulta: r.itens.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Junção do que a consulta achou com o que o novidades.js já tinha (E11).
//
// Pura de propósito (sem rede, sem disco), para a régua provar as três garantias:
//  • sem duplicata — o id é determinístico (fonte+norma+dispositivo+conteúdo), então a
//    rotina automática e o botão manual, mesmo rodando juntos, convergem no mesmo registro;
//  • o que é da PESSOA fica — `detectadoEm` (quando apareceu pela primeira vez) e `lido`;
//    `revisar` e `pendencia` NÃO são herdados: vêm do achado de agora, para uma regra nova
//    (recorte, autoria, efeitos) valer também para item antigo;
//  • baixa do que já entrou — informativo cuja edição já está no juris-index.js sai com
//    incorporado:true, revisar:false e sem pendência. Antes ele ficava "pendente" para
//    sempre, mesmo depois de incorporado ao CátedraJURIS (scripts/atualizar-informativos.py).
//    Item do Planalto recebe a mesma baixa quando `noAcervo(it)` diz que o leis-seca.js de
//    agora já tem o `depois` dele — e só para item que ESTA rodada não voltou a achar.
//    `incorporadoTxt` diz ONDE o item já está ('já no LEGIS' / 'já no JURIS'): é o texto do
//    selo na tela, que não pode afirmar o JURIS para uma mudança de lei;
//  • item de comparação PARCIAL nunca recebe baixa — ver o laço;
//  • a baixa do informativo segue o acervo DESTA árvore: o novidades.js que diz "já no
//    JURIS" para uma edição que o juris-index.js daqui não tem volta o item a pendente.
// `ult` = ultimasEdicoes() — { stf, stj, stjExtra, presentes }; fonte com null não recebe
// baixa, e a baixa segue a PRESENÇA da edição no acervo (lacuna não ganha "já no JURIS").
// `noAcervo` (opcional) = função montada em rodar(): sem ela, nenhum PLN-* recebe baixa.
// ─────────────────────────────────────────────────────────────────────────────
const RE_ID_INF = /^INF-(STF|STJ)-(EE)?(\d+)$/;
// A edição do item diante do acervo de agora: 'dentro' (já no juris-index.js), 'fora'
// (ainda não) ou null (não é informativo, ou o acervo não pôde ser lido — e então nada se
// afirma, nem baixa nem baixa desfeita).
// Vale a PRESENÇA da edição (`ult.presentes`, de ultimasDoIndice), não o número máximo: com
// lacuna no acervo (901 e 903, sem a 902), "n ≤ última" dava "já no JURIS" para a 902. Quem
// só passa { stf, stj, stjExtra } (sem a lista) cai no máximo.
function edicaoNoAcervo(it, ult) {
  const m = RE_ID_INF.exec(String((it && it.id) || ''));
  if (!m || !ult) return null;
  const fonte = m[1].toLowerCase(), n = Number(m[3]);
  if (typeof ult[fonte] !== 'number') return null;   // sem acervo legível, nada de baixa
  const serie = m[2] ? 'stjExtra' : fonte;
  const teto = ult[serie];
  if (typeof teto !== 'number') return null;
  const pres = ult.presentes && ult.presentes[serie];
  if (Array.isArray(pres)) return pres.includes(n) ? 'dentro' : 'fora';
  return n <= teto ? 'dentro' : 'fora';
}
export function edicaoIncorporada(it, ult) { return edicaoNoAcervo(it, ult) === 'dentro'; }

// Onde o item já está, no texto do selo: mudança de lei entra no CátedraLEGIS; informativo,
// no CátedraJURIS.
const ONDE_INCORPORADO = { planalto: 'já no LEGIS', stf: 'já no JURIS', stj: 'já no JURIS' };
function darBaixa(it) {
  const b = { ...it, incorporado: true, incorporadoTxt: ONDE_INCORPORADO[it.fonte] || 'já no acervo', revisar: false };
  delete b.pendencia;
  return b;
}
// O contrário: o novidades.js de partida dizia "já no JURIS", mas o juris-index.js desta
// árvore não tem a edição. No workflow, isso seria a incorporação de hoje trazendo menos que
// a do PR aberto (página que não respondeu) — a trava de recuo (--conferir-recuo) para o job
// antes; isto é a rede de segurança para qualquer outro caminho: o item volta a pendente, e
// o novidades.js nunca afirma um acervo que a mesma árvore não traz.
function desfazerBaixa(it) {
  const b = { ...it, revisar: true, pendencia: PENDENCIA_INF };
  delete b.incorporado;
  delete b.incorporadoTxt;
  return b;
}

export function mesclarNovidades(atuais, achados, ult, noAcervo) {
  const antigos = new Map((atuais || []).map((i) => [i.id, i]));
  const porId = new Map(antigos);
  const idsNovos = [];
  const vistos = new Set();
  for (const it of achados || []) {
    vistos.add(it.id);
    const velho = porId.get(it.id);
    if (velho) porId.set(it.id, { ...it, detectadoEm: velho.detectadoEm || it.detectadoEm, lido: !!velho.lido });
    else { porId.set(it.id, it); idsNovos.push(it.id); }
  }
  // `baixas` = itens que o novidades.js já tinha e cujo estado de revisão mudou nesta rodada
  // (baixa de item incorporado, baixa desfeita, ou revisar recalculado pela regra de agora).
  // Rodada só de baixas não traz item novo, mas MUDA o que a tela mostra: o workflow grava
  // por ela também.
  let baixas = 0;
  const plnNoAcervo = (it) => it.fonte === 'planalto' && !vistos.has(it.id) && typeof noAcervo === 'function' && noAcervo(it);
  for (const [id, it] of porId) {
    // Comparação PARCIAL (artigo cortado no teto, 3) nunca recebe baixa: noAcervo compara,
    // nesse caso, só o começo do texto (difereNoTrechoComum), e começo igual não prova que o
    // acervo tem o artigo inteiro. "Já no LEGIS" seria afirmação sem prova; fica para conferir.
    const ed = edicaoNoAcervo(it, ult);
    let final = it;
    if (!it.parcial && (ed === 'dentro' || plnNoAcervo(it))) final = darBaixa(it);
    else if (ed === 'fora' && it.incorporado) final = desfazerBaixa(it);
    porId.set(id, final);
    const v = antigos.get(id);
    if (v && (!!v.incorporado !== !!final.incorporado || !!v.revisar !== !!final.revisar)) baixas++;
  }
  const itens = [...porId.values()].sort((a, b) =>
    String(b.detectadoEm).localeCompare(String(a.detectadoEm)) || String(a.id).localeCompare(String(b.id)));
  return {
    itens,
    novos: idsNovos.length,
    baixas,
    // `novosItens` = o que nem o novidades.js conhecia (o botão conta estes, não o acumulado
    // do bundle); `achados` = o que ESTA consulta viu, já com o estado de leitura preservado.
    novosItens: idsNovos.map((id) => porId.get(id)),
    achados: (achados || []).map((it) => porId.get(it.id)),
  };
}

/** O diário anterior (sentinela/estado.json, ou as `fontes` do novidades.js) — a api monta o
 *  `anterior` a partir dele para o último sucesso não sumir numa falha. */
export function estadoAnterior() { return lerEstado(); }

/** Ids de um novidades.js qualquer (o do último PR do sentinela fechado SEM merge). */
export function lerIdsPropostos(caminho) {
  try {
    const ctx = { window: {} };
    vm.createContext(ctx);
    vm.runInContext(readFileSync(caminho, 'utf8'), ctx);
    return ((ctx.window.CT_NOVIDADES && ctx.window.CT_NOVIDADES.itens) || []).map((i) => i.id).filter(Boolean);
  } catch (_) { return []; }
}

/** Uma rodada completa. Os parâmetros opcionais existem para a régua rodar o caminho
 *  inteiro SEM rede: `busca.baixarLei(url)` e `busca.buscar(url)` trocam as leituras das
 *  fontes; `leis`, `ultimas`, `anterior` e `atuais` trocam o que viria do disco.
 *  `jaPropostos` = ids que um PR do sentinela já propôs e a dona fechou SEM mesclar: eles
 *  continuam no resultado (a mudança na fonte é real), mas não contam como novos — sem isso,
 *  partindo do novidades.js da main, o mesmo item reabria um PR a cada dia.
 *  `ultimasConsulta` = de onde a DETECÇÃO dos informativos parte, quando não é o acervo de
 *  agora. O workflow incorpora antes de detectar e passa as últimas edições de ANTES da
 *  incorporação: assim a edição que acabou de entrar é detectada (vira item, com a URL
 *  oficial) e, na mesma junção, recebe a baixa contra o acervo de agora (`ultimas`) — o
 *  novidades.js do PR lista "já no JURIS" exatamente o que o juris-index.js do PR traz. */
export async function rodar({ fontes = ['planalto', 'stf', 'stj'], busca = {}, leis, ultimas, ultimasConsulta, anterior, atuais, jaPropostos, silencioso = false, prazo = 0 } = {}) {
  const diga = silencioso ? () => {} : log;
  const antes = anterior || lerEstado();
  const estado = { geradoEm: agora(), fontes: { ...(antes.fontes || {}) } };
  const achados = [];
  let ult = ultimas || null;
  const ultDoAcervo = () => { if (!ult) { try { ult = ultimasEdicoes(); } catch (_) { ult = { stf: null, stj: null, stjExtra: null }; } } return ult; };
  // Para a baixa do Planalto: as normas lidas por inteiro nesta rodada e o acervo com que
  // foram comparadas.
  const conferidas = new Set();
  let LEIS_RODADA = [];

  for (const [k, f] of fontes.entries()) {
    const tentativaEm = agora();
    // Fatia justa do tempo que resta: a primeira fonte não come o prazo das seguintes.
    const prazoFonte = prazo ? Date.now() + Math.max(0, prazo - Date.now()) / (fontes.length - k) : 0;
    diga(`▸ ${COBERTURA[f].rotulo}…`);
    let r, LEIS = [];
    try {
      if (f === 'planalto') {
        LEIS = leis || leisDoAcervo();
        LEIS_RODADA = LEIS;
        r = await consultarPlanalto(LEIS, busca.baixarLei || baixarLei, prazoFonte);
      } else {
        r = await consultarInformativos(f, ultimasConsulta || ultDoAcervo(), busca.buscar || buscar, prazoFonte);
      }
    } catch (e) {
      r = { estado: 'falha', erro: e.message, itens: [], detalhe: '' };
    }
    if (f === 'planalto' && LEIS.length) r.normas = normasDe(LEIS);
    for (const sg of r.conferidas || []) conferidas.add(sg);
    estado.fontes[f] = carimbar(f, estado.fontes[f] || {}, r, tentativaEm);
    achados.push(...r.itens);
    diga(`  ${r.estado}${r.detalhe ? ' — ' + r.detalhe : ''}${r.erro ? ' — ' + r.erro : ''} (${r.itens.length} novidade(s))`);
  }

  // O item do Planalto só está "no acervo" se a norma foi conferida nesta rodada E o artigo
  // do leis-seca.js de agora tem o `depois` do item. Diferença que sumiu sozinha não basta:
  // a página pode ter voltado atrás, ou mudado de novo (D1→D2) — e aí o LEGIS não tem esse
  // texto, e dizer "já no LEGIS" seria afirmação falsa. No artigo cortado no teto, esta
  // conferência só vê o começo do texto — por isso mesclarNovidades nem a consulta para
  // item parcial, e aqui a comparação PARCIAL também não prova nada: um item inteiro (abaixo
  // do teto) cujo artigo, no acervo regerado, passou do teto (D1 no fim do artigo trocado por
  // um D2 longo) teria só o começo comparado. O item fica para conferir.
  const noAcervo = (it) => {
    if (!conferidas.has(it.norma) || it.depois == null) return false;
    const lei = LEIS_RODADA.find((l) => l.sigla === it.norma);
    const art = lei && soArtigosDeVerdade(lei.artigos || []).find((a) => chaveArt(a.rot) === chaveArt(it.disp));
    const c = art && difereNoTrechoComum(art.txt, it.depois);
    return !!c && !c.difere && !c.parcial;
  };
  const m = mesclarNovidades(atuais || lerNovidadesAtuais(), achados, ultDoAcervo(), noAcervo);
  const ja = new Set(jaPropostos || []);
  const novosItens = m.novosItens.filter((i) => !ja.has(i.id));
  return { estado, itens: m.itens, novos: novosItens.length, baixas: m.baixas, novosItens, achados: m.achados, fontes };
}

const CABECALHO = `/* Cátedra — CENTRAL DE NOVIDADES: o que mudou nas fontes oficiais.
 *
 * Gerado por scripts/sentinela.mjs (rotina diária do servidor + botão "Buscar
 * atualizações agora"). Cada item traz a fonte oficial, o que mudou, o antes e o depois.
 * \`fontes\` guarda, por fonte, a última tentativa E a última consulta bem-sucedida —
 * são coisas diferentes, e a tela mostra as duas.
 *
 * Não editar à mão.
 */
`;
/** O texto exato do novidades.js para um { geradoEm, fontes, itens } — a régua compara. */
export function conteudoNovidades(n) {
  return CABECALHO + 'window.CT_NOVIDADES = ' + JSON.stringify({ geradoEm: n.geradoEm, fontes: n.fontes, itens: n.itens }) + ';\n';
}

function escrever({ estado, itens }) {
  mkdirSync(PASTA, { recursive: true });
  writeFileSync(ESTADO, JSON.stringify(estado, null, 2) + '\n');
  writeFileSync(SAIDA, conteudoNovidades({ geradoEm: estado.geradoEm, fontes: estado.fontes, itens }));
}

if (import.meta.url === `file://${process.argv[1]}` && SEMENTE) {
  // Sem rede, sem tocar em sentinela/estado.json: só o pacote que vai versionado.
  const s = semente();
  if (!DRY) writeFileSync(SAIDA, conteudoNovidades(s));
  if (SO_JSON) console.log(JSON.stringify(s, null, 2));
  else log(`Semente: ${Object.keys(s.fontes).length} fontes com a cobertura e nenhuma consulta; ${s.fontes.planalto.normas.length} normas do Planalto listadas.` + (DRY ? ' (--dry-run: nada escrito)' : ' Escrito em novidades.js.'));
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}` && flag('--conferir-recuo')) {
  // Sem rede, sem escrever nada: só compara as últimas edições do juris-index.js do PR aberto
  // com as do juris-index.js desta árvore (já com a incorporação da rodada). Sai 1 no recuo
  // e 2 se não conseguir comparar — o workflow para nos dois, e o PR fica como está.
  // `--desde` (o juris-index.js da main, de antes da incorporação) é opcional: com ele, edição
  // do PR que a main tirou não conta como recuo desta rodada (ver recuoDoAcervo).
  let doPR, aqui, antes = null;
  try {
    doPR = ultimasDeArquivo(val('--conferir-recuo', ''));
    if (flag('--desde')) antes = ultimasDeArquivo(val('--desde', ''));
    aqui = ultimasEdicoes();
  } catch (e) { console.error(`não foi possível comparar o acervo desta rodada com o do PR aberto: ${e.message}`); process.exit(2); }
  const recuo = recuoDoAcervo(doPR, aqui, antes);
  if (recuo) {
    console.error(`A incorporação desta rodada ficou atrás do PR aberto — ${recuo}. Provavelmente a página do tribunal não respondeu; o PR fica como está.`);
    process.exit(1);
  }
  log(`Acervo desta rodada em dia com o PR aberto (STF até a ${aqui.stf}, STJ até a ${aqui.stj}, extraordinárias até a ${aqui.stjExtra}).`);
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}` && flag('--novas-alem-de')) {
  // Sem rede, sem escrever nada (workflow, referência = PR fechado sem merge): a incorporação
  // desta rodada trouxe alguma edição que a main não tinha (`--desde`) e o PR recusado também
  // não? A resposta vai na ÚLTIMA linha, `novas=sim` ou `novas=nao`, com saída 0; qualquer
  // outra saída é erro (2 quando não consegue ler um dos acervos) — o workflow para, em vez de
  // ler uma queda como "nada novo".
  let recusado, antes, aqui;
  try {
    recusado = ultimasDeArquivo(val('--novas-alem-de', ''));
    antes = ultimasDeArquivo(val('--desde', ''));
    aqui = ultimasEdicoes();
  } catch (e) { console.error(`não foi possível comparar o acervo desta rodada com o do PR recusado: ${e.message}`); process.exit(2); }
  const novas = edicoesNovasAlem(antes, aqui, recusado);
  log(novas.length
    ? `A incorporação desta rodada trouxe o que o PR recusado não tinha: ${novas.join(', ')}.`
    : 'A incorporação desta rodada não trouxe edição além do que o PR recusado já propunha — sozinha, ela não reabre PR.');
  console.log(`novas=${novas.length ? 'sim' : 'nao'}`);
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const so = val('--fonte', '');
  const fontes = so ? so.split(',').map((s) => s.trim()).filter((f) => COBERTURA[f]) : ['planalto', 'stf', 'stj'];
  if (!fontes.length) { console.error('fonte desconhecida; use planalto, stf ou stj'); process.exit(2); }
  // Antes de qualquer consulta: com o acervo de partida ilegível, a detecção compararia
  // contra nada — melhor parar aqui, com o motivo, do que detectar a partir de "nenhuma".
  let ultimasConsulta;
  if (flag('--detectar-desde')) {
    try { ultimasConsulta = ultimasDeArquivo(val('--detectar-desde', '')); } catch (e) { console.error(`--detectar-desde: ${e.message}`); process.exit(2); }
    log(`Informativos detectados a partir do acervo de antes da incorporação (STF ${ultimasConsulta.stf}, STJ ${ultimasConsulta.stj}, extraordinária ${ultimasConsulta.stjExtra}); a baixa compara com o juris-index.js de agora.`);
  }
  const arqPropostos = val('--ja-propostos', '');
  const jaPropostos = arqPropostos ? lerIdsPropostos(arqPropostos) : [];
  if (arqPropostos) log(`${jaPropostos.length} item(ns) de PR fechado sem merge não contam como novos (${arqPropostos}).`);
  const r = await rodar({ fontes, jaPropostos, ultimasConsulta });
  if (!DRY) escrever(r);
  if (SO_JSON) console.log(JSON.stringify({ ...r.estado, novos: r.novos, baixas: r.baixas, itens: r.itens }, null, 2));
  else {
    log(`\n${r.itens.length} novidade(s) no total, ${r.novos} nova(s) e ${r.baixas} com a revisão mudada nesta rodada.` + (DRY ? ' (--dry-run: nada escrito)' : ` Escrito em novidades.js e ${ESTADO.replace(ROOT + '/', '')}.`));
  }
  if (process.env.GITHUB_OUTPUT) {
    const falhas = fontes.filter((f) => r.estado.fontes[f] && r.estado.fontes[f].resultado === 'falha');
    appendFileSync(process.env.GITHUB_OUTPUT, `novos=${r.novos}\nbaixas=${r.baixas}\nfalhas=${falhas.join(',')}\n`);
  }
  // Falha de fonte não derruba o processo: o relatório já diz o que falhou, e derrubar
  // faria a rotina diária não gravar o que as outras fontes conseguiram ler.
  process.exit(0);
}
