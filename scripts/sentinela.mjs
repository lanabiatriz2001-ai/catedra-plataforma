// scripts/sentinela.mjs — vigia das fontes oficiais do LEGIS e do JURIS.
//
// O que ele faz: lê as fontes oficiais, compara com o que o Cátedra já tem no bundle e
// escreve DUAS coisas — `novidades.js` (o que mudou, para a Central de novidades do app)
// e `dados/sentinela/estado.json` (o diário de bordo: por fonte, a última TENTATIVA e a
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
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
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
const PASTA = join(ROOT, 'dados', 'sentinela');
const ESTADO = join(PASTA, 'estado.json');
const SAIDA = join(ROOT, 'novidades.js');
const MAX_EDICOES = parseInt(val('--max-edicoes', '12'), 10);

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
      'não descobre normas novas sozinho: o índice de legislação do Planalto está atrás de escudo anti-robô (F5/TSPD) e não responde de forma confiável — norma nova entra pelo catálogo do CátedraLEGIS',
      'a data de entrada em vigor só é afirmada quando a própria página traz a anotação; fora disso o item fica como vigência não informada, pendente de conferência',
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

function lerEstado() {
  if (!existsSync(ESTADO)) return { fontes: {} };
  try { return JSON.parse(readFileSync(ESTADO, 'utf8')); } catch (_) { return { fontes: {} }; }
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
const RE_MOD = /\((Reda[çc][ãa]o dada|Inclu[íi]d[oa]|Revogad[oa]|Renumerad[oa])\s+pel[ao]\s+([^)]{4,90}?)\)/gi;
const RE_VIG = /\((?:Vig[êe]ncia|Produ[çc][ãa]o de efeito[s]?)\)/i;
const RE_DATA = /\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/;

function anotacoes(txt) {
  const mods = [];
  let m;
  RE_MOD.lastIndex = 0;
  while ((m = RE_MOD.exec(txt))) mods.push({ acao: m[1].toLowerCase(), norma: m[2].replace(/\s+/g, ' ').trim() });
  const dm = RE_DATA.exec(txt);
  return {
    modificadoras: mods,
    temMarcadorVigencia: RE_VIG.test(txt),
    dataNoTexto: dm ? `${dm[1].padStart(2, '0')}/${dm[2].padStart(2, '0')}/${dm[3]}` : null,
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
  if (!a.temMarcadorVigencia) return { vigencia: 'em-vigor', vigenciaEm: null, motivo: 'texto compilado sem marcador de vigência própria' };
  if (a.dataNoTexto) {
    const [d, mo, y] = a.dataNoTexto.split('/').map(Number);
    const dt = new Date(y, mo - 1, d);
    if (dt > hoje) return { vigencia: 'aguardando', vigenciaEm: a.dataNoTexto, motivo: 'a página traz marcador de vigência e data futura' };
    return { vigencia: 'em-vigor', vigenciaEm: a.dataNoTexto, motivo: 'marcador de vigência com data já alcançada' };
  }
  return { vigencia: 'indeterminada', vigenciaEm: null, motivo: 'a página marca vigência própria mas não informa a data — conferir na fonte' };
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
const ehCabecalho = (rot) => /^Art/.test(String(rot).trim());
const soArtigosDeVerdade = (arts) => arts.filter((a) => ehCabecalho(a.rot));

/** Compara dois conjuntos de artigos e devolve as diferenças jurídicas. */
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
    if (!D.has(k)) out.push({ tipo: 'revogacao', rot: velho.rot, antes: normalizar(velho.txt), depois: null });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonte 1 — Planalto
// ─────────────────────────────────────────────────────────────────────────────
async function consultarPlanalto() {
  const w = carregarGlobais(['leis-seca.js']);
  const LEIS = w.CT_LEIS || [];
  if (!LEIS.length) return { estado: 'falha', erro: 'leis-seca.js vazio ou ausente — sem base de comparação', itens: [], detalhe: '' };

  const itens = [];
  let lidas = 0;
  const falhas = [];
  for (const lei of LEIS) {
    try {
      const arts = await baixarLei(lei.url);
      const difs = compararArtigos(lei.artigos, arts);
      if (difs.length) {
        // CONFERÊNCIA DE ORIGEM: a página do Planalto já devolveu conteúdo oscilante numa
        // leitura isolada (visto em 15/09/2026, na Lei Maria da Penha). Diferença só vira
        // novidade se a SEGUNDA leitura repetir exatamente a mesma diferença.
        const arts2 = await baixarLei(lei.url);
        const difs2 = compararArtigos(lei.artigos, arts2);
        const assina = (d) => d.map((x) => x.tipo + '|' + chaveArt(x.rot) + '|' + sha(x.depois || '')).sort().join(';');
        if (assina(difs) !== assina(difs2)) {
          falhas.push(`${lei.sigla}: leituras divergentes entre si — não confirmado, nada registrado`);
          lidas++;
          continue;
        }
        for (const d of difs) {
          const base = d.depois || d.antes || '';
          const v = d.tipo === 'revogacao'
            ? { vigencia: 'em-vigor', vigenciaEm: null, motivo: 'dispositivo ausente do texto compilado' }
            : classificarVigencia(base);
          const mods = modificadorasDaDiferenca(d.antes, d.depois);
          const todasMods = anotacoes(base).modificadoras;
          const modsPublicadas = mods.length ? mods : todasMods;
          itens.push({
            id: 'PLN-' + lei.sigla.replace(/\W+/g, '') + '-' + chaveArt(d.rot) + '-' + sha((d.depois || '') + (d.antes || '')),
            fonte: 'planalto',
            fonteRotulo: COBERTURA.planalto.rotulo,
            tipo: d.tipo,
            norma: lei.sigla,
            normaNome: lei.nome,
            disp: d.rot,
            titulo: `${d.rot} — ${lei.sigla}`,
            antes: d.antes,
            depois: d.depois,
            modificadora: modsPublicadas.length ? modsPublicadas[modsPublicadas.length - 1].norma : null,
            modificadoras: modsPublicadas,
            vigencia: v.vigencia,
            vigenciaEm: v.vigenciaEm,
            vigenciaMotivo: v.motivo,
            parcial: !!d.parcial,
            revisar: v.vigencia === 'indeterminada' || !!d.parcial,
            urlOficial: lei.url,
            detectadoEm: agora(),
            lido: false,
          });
        }
      }
      lidas++;
    } catch (e) {
      // Estrutura da fonte mudou ou a rede caiu: registra a falha e PRESERVA o último
      // conteúdo válido (que continua sendo o do bundle). Nada é apagado, nada é inventado.
      falhas.push(`${lei.sigla}: ${e.message}`);
    }
  }

  if (!lidas) return { estado: 'falha', erro: 'nenhuma norma pôde ser lida: ' + falhas.slice(0, 3).join('; '), itens: [], detalhe: `0/${LEIS.length} normas lidas` };
  const parcial = falhas.length > 0;
  return {
    estado: parcial ? 'parcial' : (itens.length ? 'novidades' : 'sem-novidade'),
    erro: parcial ? falhas.join('; ') : null,
    detalhe: `${lidas}/${LEIS.length} normas lidas`,
    itens,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fontes 2 e 3 — Informativos do STF e do STJ
//
// Detecção só: o vigia descobre que a edição N+1 existe e a registra como novidade. Quem
// PARSEIA e incorpora ao acervo é scripts/atualizar-informativos.py, que já faz isso há
// tempo e é o dono desse formato. Dois parsers do mesmo HTML seria pedir divergência.
// ─────────────────────────────────────────────────────────────────────────────
export function ultimasEdicoes() {
  const w = carregarGlobais(['juris-index.js']);
  const IDX = w.__JURIS_IDX__ || [];
  const num = (fo) => IDX.filter((r) => r[2] === fo && typeof r[3] === 'number').map((r) => r[3]);
  // Sem teto, nos dois. scripts/atualizar-informativos.py corta o STJ em `nu < 900` para
  // separar edição ordinária de extraordinária — mas as extraordinárias do acervo usam
  // `nu` de 28 a 33 (conferido em 15/09/2026; elas se distinguem pelo id `-EE<n>-`, não
  // pelo número). O teto só fazia o vigia reanunciar a edição 900, que já está no bundle.
  // E aplicá-lo ao STF travava a busca na 862 com o acervo já na 1224.
  const stf = num('informativo_stf'), stj = num('informativo_stj');
  const ee = IDX.map((r) => /^INF\d{4}-STJ-EE(\d+)-/.exec(String(r[0]))).filter(Boolean).map((m) => +m[1]);
  return {
    stf: stf.length ? Math.max(...stf) : null,
    stj: stj.length ? Math.max(...stj) : null,
    stjExtra: ee.length ? Math.max(...ee) : 27,
  };
}

async function buscar(url, timeoutMs = 40000) {
  const r = await buscarFonte(url, { timeoutMs });
  return { status: r.status, tam: r.buffer.length, texto: r.buffer.toString('latin1') };
}

// Uma edição existe quando a página responde 200 E traz MIOLO de informativo. Os dois
// tribunais avisam de jeitos diferentes, e o jeito do STJ é traiçoeiro:
//
//  • STF devolve 404 limpo para edição que não saiu — dá para confiar no status.
//  • STJ devolve 200 com a PÁGINA DE BUSCA VAZIA, de 257 KB, contendo "PROCESSO" e
//    "RAMO DO DIREITO" (que vêm do formulário, não do conteúdo). Medido em 15/09/2026:
//    a edição inexistente 7777 era indistinguível da 901 por esse critério, e o vigia
//    anunciou 15 edições que não existem. O que só a página REAL tem é a contagem de
//    resultados ("20registro…") e o cabeçalho em caixa alta "EDIÇÃO N. 900".
export function pareceInformativo(fonte, r) {
  if (r.status !== 200 || r.tam < 8000) return false;
  if (fonte === 'stf') return /INFORMATIVO\s*[\r\n\s]*STF/i.test(r.texto);
  const temContagem = /\d+\s*registro/i.test(r.texto);
  const temCabecalho = /EDI[ÇC][ÃA]O\s+N\.\s*\d+/.test(r.texto);
  return temContagem && temCabecalho;
}

async function consultarInformativos(fonte) {
  const ult = ultimasEdicoes();
  const base = fonte === 'stf' ? ult.stf : ult.stj;
  if (base == null) return { estado: 'falha', erro: 'não foi possível ler a última edição no acervo (juris-index.js)', itens: [], detalhe: '' };

  const alvos = [];
  for (let n = base + 1; n <= base + MAX_EDICOES; n++) {
    alvos.push({ n, rotulo: `Informativo ${n} do ${fonte.toUpperCase()}`, url: fonte === 'stf'
      ? `https://www.stf.jus.br/arquivo/informativo/documento/informativo${n}.htm`
      : `https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisarumaedicao&livre=%27${String(n).padStart(4, '0')}%27.cod.` });
  }
  if (fonte === 'stj') {
    for (let n = ult.stjExtra + 1; n <= ult.stjExtra + 3; n++) {
      alvos.push({ n, extra: true, rotulo: `Informativo Extraordinário ${n} do STJ`, url: `https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisarumaedicao&livre=%27${String(n).padStart(4, '0')}E%27.cod.` });
    }
  }

  const itens = [];
  const falhas = [];
  let consultadas = 0, seguidasVazias = 0;
  for (const alvo of alvos) {
    if (seguidasVazias >= 2 && !alvo.extra) break;   // duas em branco = chegamos no fim
    try {
      const r = await buscar(alvo.url);
      consultadas++;
      if (pareceInformativo(fonte, r)) {
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
          // Julgado novo NÃO significa entendimento superado: a classificação de
          // superação/divergência é feita pelo build do acervo (build-semana-juris.mjs),
          // sobre o texto já incorporado, e não por data. Aqui o item nasce pendente.
          revisar: true,
          pendencia: 'edição detectada na fonte oficial; o conteúdo entra no acervo quando scripts/atualizar-informativos.py rodar',
          urlOficial: alvo.url,
          detectadoEm: agora(),
          lido: false,
        });
      } else if (!alvo.extra) seguidasVazias++;
    } catch (e) {
      falhas.push(`edição ${alvo.n}: ${e.message}`);
    }
  }

  if (!consultadas) return { estado: 'falha', erro: 'a fonte não respondeu: ' + falhas.slice(0, 2).join('; '), itens: [], detalhe: '' };
  return {
    estado: falhas.length ? 'parcial' : (itens.length ? 'novidades' : 'sem-novidade'),
    erro: falhas.length ? falhas.join('; ') : null,
    detalhe: `a partir da edição ${base + 1}; ${consultadas} consultadas`,
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
    ultimaTentativa: tentativaEm,
    ultimoSucesso: okAgora ? tentativaEm : (anterior.ultimoSucesso || null),
    resultado: r.estado,
    erro: r.erro || null,
    detalhe: r.detalhe || '',
    novidadesNaConsulta: r.itens.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
export async function rodar({ fontes = ['planalto', 'stf', 'stj'] } = {}) {
  const anterior = lerEstado();
  const estado = { geradoEm: agora(), fontes: { ...(anterior.fontes || {}) } };
  const achados = [];

  for (const f of fontes) {
    const tentativaEm = agora();
    log(`▸ ${COBERTURA[f].rotulo}…`);
    let r;
    try {
      r = f === 'planalto' ? await consultarPlanalto() : await consultarInformativos(f);
    } catch (e) {
      r = { estado: 'falha', erro: e.message, itens: [], detalhe: '' };
    }
    estado.fontes[f] = carimbar(f, estado.fontes[f] || {}, r, tentativaEm);
    achados.push(...r.itens);
    log(`  ${r.estado}${r.detalhe ? ' — ' + r.detalhe : ''}${r.erro ? ' — ' + r.erro : ''} (${r.itens.length} novidade(s))`);
  }

  // Sem duplicata: o id é determinístico (fonte+norma+dispositivo+conteúdo), então a
  // rotina automática e o botão manual, mesmo rodando juntos, convergem para o mesmo
  // registro. Item já conhecido preserva o que a pessoa fez com ele (lido, revisado).
  const atuais = lerNovidadesAtuais();
  const porId = new Map(atuais.map((i) => [i.id, i]));
  let novos = 0;
  for (const it of achados) {
    if (porId.has(it.id)) {
      const velho = porId.get(it.id);
      porId.set(it.id, { ...it, detectadoEm: velho.detectadoEm, lido: velho.lido, revisar: velho.revisar });
    } else { porId.set(it.id, it); novos++; }
  }
  const itens = [...porId.values()].sort((a, b) => String(b.detectadoEm).localeCompare(String(a.detectadoEm)));

  return { estado, itens, novos, fontes };
}

function escrever({ estado, itens }) {
  mkdirSync(PASTA, { recursive: true });
  writeFileSync(ESTADO, JSON.stringify(estado, null, 2) + '\n');
  const cab = `/* Cátedra — CENTRAL DE NOVIDADES: o que mudou nas fontes oficiais.
 *
 * Gerado por scripts/sentinela.mjs (rotina diária do servidor + botão "Buscar
 * atualizações agora"). Cada item traz a fonte oficial, o que mudou, o antes e o depois.
 * \`fontes\` guarda, por fonte, a última tentativa E a última consulta bem-sucedida —
 * são coisas diferentes, e a tela mostra as duas.
 *
 * Não editar à mão.
 */
`;
  writeFileSync(SAIDA, cab + 'window.CT_NOVIDADES = ' + JSON.stringify({ geradoEm: estado.geradoEm, fontes: estado.fontes, itens }) + ';\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const so = val('--fonte', '');
  const fontes = so ? so.split(',').map((s) => s.trim()).filter((f) => COBERTURA[f]) : ['planalto', 'stf', 'stj'];
  if (!fontes.length) { console.error('fonte desconhecida; use planalto, stf ou stj'); process.exit(2); }
  const r = await rodar({ fontes });
  if (!DRY) escrever(r);
  if (SO_JSON) console.log(JSON.stringify({ ...r.estado, itens: r.itens }, null, 2));
  else {
    log(`\n${r.itens.length} novidade(s) no total, ${r.novos} nova(s) nesta rodada.` + (DRY ? ' (--dry-run: nada escrito)' : ` Escrito em novidades.js e ${ESTADO.replace(ROOT + '/', '')}.`));
  }
  // Falha de fonte não derruba o processo: o relatório já diz o que falhou, e derrubar
  // faria a rotina diária não gravar o que as outras fontes conseguiram ler.
  process.exit(0);
}
