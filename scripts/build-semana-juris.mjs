// scripts/build-semana-juris.mjs — gera semana-juris.js: o que mudou nos informativos
// recentes do STF, STJ e TSE, para o bloco "O que mudou esta semana" no Início.
//
// Por que um script, e não busca em runtime: o app funciona off-line e em file:// no
// nativo. O acervo é atualizado por fora (atualizar-informativos.py); aqui só se recorta
// o que já está no bundle e se calcula o marcador uma vez, no build.
//
// Uso: node scripts/build-semana-juris.mjs [quantidade]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const QTD = Math.max(10, parseInt(process.argv[2], 10) || 60);   // itens no arquivo final

// ---- carrega o acervo do próprio bundle (índice leve + textos)
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ['juris-index.js', 'juris-text.js']) {
  vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx);
}
const IDX = ctx.window.__JURIS_IDX__ || [];
const TXT = ctx.window.__JURIS_TXT__ || {};
const I = { id: 0, tr: 1, fo: 2, nu: 3, ti: 4, ra: 5, te: 6, da: 7 };

const data = (s) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || ''));
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
};

// ---- MARCADORES
// Cada padrão nasceu de leitura de texto real do acervo e passou por uma revisão
// adversarial (um agente propôs, outro tentou derrubar procurando falso positivo).
// A regra da casa é conservadora: marcador nulo é permitido, marcador ERRADO não —
// um "entendimento superado" falso faz a pessoa estudar o que não caiu.
const MARCADORES = [
  { chave: 'superacao', rotulo: 'entendimento superado',
    re: /\b(superad[oa]\s+(o\s+)?entendimento|entendimento\s+superad[oa]|cancelad[ao]\s+a\s+s[úu]mula|s[úu]mula\s+\d+\s+cancelad[ao]|overruling|revog(?:ou|ada|ado)\s+(?:o\s+)?(?:entendimento|precedente|s[úu]mula)|n[ãa]o\s+subsiste\s+(?:o\s+)?entendimento)\b/i },
  { chave: 'divergencia', rotulo: 'divergência entre tribunais',
    re: /\b(diverg[êe]ncia\s+(?:jurisprudencial\s+)?entre\s+(?:o\s+)?(?:STF|STJ|as\s+turmas|as\s+se[çc][õo]es)|em\s+sentido\s+(?:diametralmente\s+)?contr[áa]rio\s+ao\s+(?:STF|STJ|entendimento\s+d[oa]))\b/i },
  { chave: 'vinculante', rotulo: 'tese vinculante nova',
    re: /\b(fixad[ao]\s+(?:a\s+)?(?:seguinte\s+)?tese|tese\s+fixada|firmou\s+(?:a\s+)?(?:seguinte\s+)?tese|sob\s+o\s+rito\s+dos?\s+(?:recursos\s+)?repetitivos|repercuss[ãa]o\s+geral\s+reconhecida|s[úu]mula\s+vinculante\s+\d+)\b/i },
];

function marcar(texto, tema) {
  const alvo = String(texto || '') + ' ' + String(tema || '');
  for (const m of MARCADORES) if (m.re.test(alvo)) return m.chave;
  return null;   // sem marcador é resultado legítimo, não falha
}

// ---- recorte: informativos com data, do mais novo para o mais velho
const inf = IDX
  .filter((v) => /^informativo_/.test(v[I.fo] || '') && data(v[I.da]))
  .sort((a, b) => data(b[I.da]) - data(a[I.da]));

if (!inf.length) { console.error('nenhum informativo com data no acervo'); process.exit(1); }

const itens = inf.slice(0, QTD * 4).map((v) => {
  const t = TXT[v[I.id]] || {};
  const tese = String(t.en || '').replace(/\s+/g, ' ').trim();
  return {
    id: v[I.id],
    tribunal: v[I.tr] || '',
    informativo: v[I.nu] != null ? String(v[I.nu]) : '',
    titulo: String(v[I.ti] || '').trim(),
    tema: String(v[I.te] || '').trim(),
    ramo: String(v[I.ra] || '').trim(),
    quando: v[I.da],
    tese: tese.slice(0, 340),
    marcador: marcar(tese, v[I.te]),
  };
}).filter((x) => x.tese);

// os marcados primeiro (é o que muda o estudo), depois os demais por data
const marcados = itens.filter((x) => x.marcador);
const resto = itens.filter((x) => !x.marcador);
const saida = marcados.concat(resto).slice(0, QTD);

const cont = saida.reduce((a, x) => { a[x.marcador || 'sem marcador'] = (a[x.marcador || 'sem marcador'] || 0) + 1; return a; }, {});

writeFileSync(join(ROOT, 'semana-juris.js'),
  '// Gerado por scripts/build-semana-juris.mjs a partir do acervo do CátedraJURIS.\n'
  + '// Não editar à mão — rode o script depois de atualizar os informativos.\n'
  + '// Marcadores: entendimento superado, divergência entre tribunais, tese vinculante nova.\n'
  + '// Nulo é resultado legítimo: melhor sem marcador que com marcador errado.\n'
  + 'window.CT_SEMANA = ' + JSON.stringify({
      gerado: saida[0] ? saida[0].quando : '', total: saida.length, itens: saida,
    }) + ';\n');

console.log(`semana-juris.js: ${saida.length} itens (de ${inf.length} informativos) · ${JSON.stringify(cont)}`);
console.log(`mais recente: ${saida[0] && saida[0].quando} · ${saida[0] && saida[0].titulo}`);
