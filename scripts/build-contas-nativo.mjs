// scripts/build-contas-nativo.mjs — converte a Central de Contas (TCU + TCEs) do
// formato do CátedraJURIS WEB para o formato do módulo NATIVO (Swift).
//
// Por que existe: o app nativo (aba CátedraJURIS no Mac e no iPad) lê um
// `corpus.json` com [JurisEntry], enquanto a web lê `contas-index.js` (matriz
// compacta) + `contas-text.js` (dicionário de textos). São os MESMOS dados em duas
// formas; este script traduz uma na outra para os dois lados mostrarem o mesmo acervo.
//
// Entrada:  contas-index.js + contas-text.js  (gerados por scripts/build-contas.mjs)
// Saída:    corpus-contas.json  — [JurisEntry], carregado pelo LibraryStore ao lado
//           do corpus.json de STF/STJ/TSE/TJRO.
//
// O que este script NÃO faz: não vai à rede e não inventa dado. Se um campo não
// existe na origem, sai nulo. Em particular a DATA dos boletins é só o ano ("2026"),
// porque é só isso que o CSV de dados abertos do TCU carrega naquele campo — o
// LibraryStore trata data com tamanho ≠ 10 como "sem data" na ordenação, então isso
// degrada de forma limpa em vez de mentir um dia 01.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Os dois arquivos são `window.__X__ = …`; executamos com um window de mentira.
globalThis.window = globalThis.window || {};
const carrega = (f) => new Function('window', readFileSync(join(ROOT, f), 'utf8'))(globalThis.window);
carrega('contas-index.js');
carrega('contas-text.js');

const IDX = globalThis.window.__CONTAS_IDX__ || [];
const TXT = globalThis.window.__CONTAS_TXT__ || {};
const META = globalThis.window.__CONTAS_META__ || {};
if (!IDX.length) throw new Error('contas-index.js não trouxe registro nenhum');

// [id, tribunal, base, numero, titulo, area, tema, data, situacao, destaque]
const I = { id: 0, tr: 1, fo: 2, nu: 3, ti: 4, ra: 5, te: 6, da: 7, si: 8, im: 9 };

// O `fonte` do nativo é o rawValue de um enum Swift FECHADO (Fonte), não um rótulo.
// Estes cinco casos foram acrescentados ao enum junto com este script; mudar um valor
// aqui sem mudar lá joga o registro no balde `.outro`.
function fonteNativa(tribunal, base) {
  if (base === 'Súmula') return tribunal === 'TCU' ? 'sumula_tcu' : 'sumula_tce';
  if (base === 'Boletim de Jurisprudência') return 'boletim_juris_tcu';
  if (base === 'Boletim de Pessoal') return 'boletim_pessoal_tcu';
  if (base === 'Informativo de Licitações e Contratos') return 'info_lic_tcu';
  throw new Error('base sem correspondência no enum Fonte: ' + base);
}

const vazioNulo = (v) => (v == null || v === '' ? null : v);

// Data em DD/MM/AAAA vira número comparável; o resto (só o ano, ou vazio) vale -1.
function ordemData(d) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d || '');
  return m ? +(m[3] + m[2] + m[1]) : -1;
}

// O CSV de súmulas do TCU traz DUAS linhas para as súmulas 199 e 256 (a redação
// antiga e a atual, com datas de sessão diferentes). Na web isso só duplica um card;
// aqui não pode, porque o app nativo indexa por id e guarda grifo/nota/leitura POR ID
// — dois registros com o mesmo id fariam um sobrescrever o estado do outro. Fica a
// linha de data mais recente, que é a redação em vigor.
const porId = new Map();
let duplicados = 0;
for (const r of IDX) {
  const anterior = porId.get(r[I.id]);
  if (!anterior) { porId.set(r[I.id], r); continue; }
  duplicados++;
  if (ordemData(r[I.da]) > ordemData(anterior[I.da])) porId.set(r[I.id], r);
}

const saida = [];
let semTexto = 0;
for (const r of porId.values()) {
  const t = TXT[r[I.id]] || {};
  const ehSumula = r[I.fo] === 'Súmula';
  if (!t.en) semTexto++;
  saida.push({
    id: r[I.id],
    tribunal: r[I.tr],
    fonte: fonteNativa(r[I.tr], r[I.fo]),
    numero: Number.isInteger(r[I.nu]) ? r[I.nu] : null,
    titulo: r[I.ti] || '',
    enunciado: t.en || '',
    ramoDireito: vazioNulo(r[I.ra]),
    // `tema` e `situacao` só valem para SÚMULA. Nos boletins a origem usa esses dois
    // campos para outra coisa: `tema` é a primeira frase do enunciado cortada em 120
    // caracteres, e `situacao` guarda o número da edição ("595/2026"). O app nativo lê
    // `tema` como ASSUNTO (navegação por assuntos) e pinta `situacao` como PÍLULA DE
    // STATUS, ao lado de "Revogada" — então mandar isso para lá encheria a navegação de
    // fragmentos de frase e faria 9,3 mil verbetes parecerem ter um status que não têm.
    // A edição continua acessível: está em `numero` e em `fontePublicacao`.
    tema: ehSumula ? vazioNulo(r[I.te]) : null,
    orgaoJulgador: vazioNulo(t.og),
    data: vazioNulo(r[I.da]),
    situacao: ehSumula ? vazioNulo(r[I.si]) : null,
    fontePublicacao: vazioNulo(t.fp),
    // `referencias` e `precedentes` existem no JurisEntry, mas a origem do TCU junta
    // fundamento legal e precedentes num campo só (REFERENCIA). Separar exigiria
    // adivinhar onde um acaba e o outro começa, então o campo inteiro vai em
    // `observacao`, do jeito que a banca publicou.
    referencias: null,
    precedentes: null,
    observacao: vazioNulo(t.ob),
    url: vazioNulo(t.ur),
    comentario: vazioNulo(t.co),
    importante: r[I.im] === 1,
  });
}

// Ordem de leitura: súmulas primeiro (é o que se decora), depois os boletins do mais
// novo para o mais antigo. Sem comparador explícito a lista abriria em ordem de id.
const PESO = { sumula_tcu: 0, sumula_tce: 1, boletim_juris_tcu: 2, boletim_pessoal_tcu: 3, info_lic_tcu: 4 };
saida.sort((a, b) => {
  const p = (PESO[a.fonte] ?? 9) - (PESO[b.fonte] ?? 9);
  if (p) return p;
  if (PESO[a.fonte] <= 1) return (a.numero ?? 0) - (b.numero ?? 0);
  return (b.numero ?? 0) - (a.numero ?? 0);
});

writeFileSync(join(ROOT, 'corpus-contas.json'), JSON.stringify(saida));

const porFonte = {};
for (const e of saida) porFonte[e.fonte] = (porFonte[e.fonte] || 0) + 1;
const porTribunal = {};
for (const e of saida) porTribunal[e.tribunal] = (porTribunal[e.tribunal] || 0) + 1;

console.log(`✓ corpus-contas.json — ${saida.length} verbetes (coletado em ${META.atualizado || '?'})`);
console.log('  por fonte:    ' + JSON.stringify(porFonte));
console.log('  por tribunal: ' + JSON.stringify(porTribunal));
if (duplicados) console.log(`  ${duplicados} id(s) repetido(s) na origem — ficou a redação de data mais recente`);
if (semTexto) console.log(`  ATENÇÃO: ${semTexto} verbete(s) sem enunciado na origem`);
