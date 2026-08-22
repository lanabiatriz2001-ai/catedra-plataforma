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
// A regra da casa é conservadora: marcador nulo é permitido, marcador ERRADO não — um
// "entendimento superado" falso faz a pessoa estudar o que não caiu.
//
// Cada padrão veio de leitura de texto real e sobreviveu a uma passada adversarial.
// Medido agora no acervo do Cátedra (juris-index.js + juris-text.js): 5.875 registros com fonte
// informativo_stf/informativo_stj/informativo_tse. `campos` é parte da heurística — cada marcador
// só é confiável sobre o haystack em que foi auditado. Custo dos três juntos: ~250 ms na varredura.
//
// superacao (18 marcados · ~100 ms) — pega o tribunal MATANDO a própria jurisprudência: súmula/tese/
//   tema cancelado ou revogado, "Mudança de entendimento!", "alterou seu entendimento", bloco
//   "Entendimento anterior do STJ:", overruling em posição de oração, e revisão/modificação/
//   adequação/adaptação de tese ou tema. NÃO pega: superação por lei nova ("ficou superada a regra
//   do art. 104 do CC/1916"), cancelamento de coisa que não é jurisprudência (voo, nota fiscal,
//   decreto, tutela), o boilerplate do art. 489, §1º, VI, do CPC, negação ("NÃO foi superado"),
//   superação futura ("deve ser superada em breve"), tese abstrata SOBRE overruling, direito
//   intertemporal ("vigorava o entendimento anterior do STJ,") e "Posterior overruling" narrado.
// divergencia (15 marcados · ~100 ms) — só conflito VIVO entre cortes: tabela rotulada "STJ:" × "STF:"
//   em início de frase/bullet, par de turmas opostas do mesmo tribunal (1ª×2ª, 3ª×4ª, 5ª×6ª) desde
//   que o texto declare o contraste (diverg/dividid/SIM-NÃO/posição oposta), e enunciado explícito
//   de cisão. NÃO pega: "embargos de divergência", voto divergente/vencido, art. 942 do CPC,
//   divergência entre cláusulas ou entre paternidade biológica e registral, divergência entre juízos
//   de 1º grau, turma por extenso em citação de acórdão ("Rel. Min. X, Quarta Turma"), correntes
//   doutrinárias, conectivo adversativo ("o STJ, contudo, não aceitou") e divergência já extinta por
//   lei ou por overruling (Info 681/STJ, prisão civil na pandemia).
// vinculante (189 marcados · ~40 ms) — só quando o próprio julgado FIXA tese de observância
//   obrigatória: bloco "Tese(s) fixada(s):", "( Tema NNNN)" colado ao ano na citação processual do
//   repetitivo, e linha que É o rótulo do tema ("Tema 1387 - RR", "IAC 16"). NÃO pega: citação de
//   Tema alheio entre parênteses, "repercussão geral"/"súmula vinculante"/"recurso repetitivo" no
//   corpo da tese (quase sempre precedente de terceiro), afetação, distinguishing, ADI/ADPF, e —
//   pelo veto de órgão julgador embutido no ramo 1 (sentinela @OG@) — julgado de Turma cujo `en`
//   foi contaminado pela tese vizinha (Info 868 e Info 863 · STJ).

const MARCADORES = [
  {
    chave: 'superacao',
    rotulo: 'Superação de entendimento',
    campos: (t, r) => (t.en || '') + ' . ' + (r[I.te] || ''),   // o " . " é obrigatório: o ponto barra o gap entre campos
    re: /(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])(?:s[úu]mula|s[úu]mulas|verbete|verbetes|enunciado|enunciados|tese|teses|tema|temas|precedente|precedentes|orienta[çc][ãa]o|entendimento|entendimentos|jurisprud[êe]ncia|posicionamento)(?![0-9A-Za-zÀ-ÖØ-öø-ÿ])(?:(?!n[ãa]o\s|poder[áã]|em breve|eventual|quando\s|deve-se\s|dever[áã])[^.;:!?]){0,60}(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])(?:cancelad[oa]s?|cancelamento|cancelamentos|cancelou|revogad[oa]s?|revoga[çc][ãa]o|revogou|superad[oa]s?|superou)(?![0-9A-Za-zÀ-ÖØ-öø-ÿ])|(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])(?:cancelad[oa]s?|cancelamento|cancelamentos|cancelou|revogad[oa]s?|revoga[çc][ãa]o|revogou|superad[oa]s?|superou)(?![0-9A-Za-zÀ-ÖØ-öø-ÿ])(?:(?!n[ãa]o\s|poder[áã]|em breve|eventual|quando\s|deve-se\s|dever[áã])[^.;:!?]){0,35}(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])(?:s[úu]mula|s[úu]mulas|verbete|verbetes|enunciado|enunciados|tese|teses|tema|temas|precedente|precedentes|orienta[çc][ãa]o|entendimento|entendimentos|jurisprud[êe]ncia|posicionamento)(?![0-9A-Za-zÀ-ÖØ-öø-ÿ])|(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])mudan[çc]a de entendimento\s*[!.]|(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])alter(?:ou|ando)\s+(?:o\s+|a\s+)?(?:seu|sua)\s+(?:entendimento|orienta[çc][ãa]o|posicionamento|jurisprud[êe]ncia)|(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])entendimento\s+(?:anterior|atual)\s+d[eo]\s+(?:STJ|STF|TSE|Superior|Supremo)\s*[:–—-]|(?:(?:^|[.;:!?]\s*)|(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])(?!(?:posterior|anterior|superveniente|eventual|futur[oa]|poss[íi]vel|hip[óo]tese)[^0-9A-Za-zÀ-ÖØ-öø-ÿ])[0-9A-Za-zÀ-ÖØ-öø-ÿ]{1,25}[^0-9A-Za-zÀ-ÖØ-öø-ÿ]{1,3})overruling(?![0-9A-Za-zÀ-ÖØ-öø-ÿ])|(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])(?:revis[ãa]o|modifica[çc][ãa]o|adequa[çc][ãa]o|adapta[çc][ãa]o)\s+d?[aàeo]s?\s*(?:tese|teses|tema|temas)(?![0-9A-Za-zÀ-ÖØ-öø-ÿ])/i,
  },
  {
    chave: 'divergencia',
    rotulo: 'Divergência entre cortes',
    campos: (t, r) => (t.en || ''),                             // só a tese: título, tema e `ob` só trouxeram ruído
    re: /^(?=[\s\S]*(?:(?:^|[\n•·*])\s*|[.?!]\s+)STJ\s*:)(?=[\s\S]*(?:(?:^|[\n•·*])\s*|[.?!]\s+)STF\s*:)|^(?=[\s\S]*(?:diverg|dividid|entendimentos?\s+(?:contr[áa]rios?|opostos?|diversos?)|posi(?:ção|ções)\s+(?:contr[áa]ri|opost|divergent|antagônic|conflitant)|(?:^|[\n•·*-]|:)\s*(?:SIM|NÃO)\s*[.,;:•]))(?=[\s\S]*\b1[ªa]\s*Turma(?!\s*(?:Recursal|C[íi]vel|Criminal|Regional|do\s+TRF|do\s+TJ|do\s+TRT)))(?=[\s\S]*\b2[ªa]\s*Turma(?!\s*(?:Recursal|C[íi]vel|Criminal|Regional|do\s+TRF|do\s+TJ|do\s+TRT)))|^(?=[\s\S]*(?:diverg|dividid|entendimentos?\s+(?:contr[áa]rios?|opostos?|diversos?)|posi(?:ção|ções)\s+(?:contr[áa]ri|opost|divergent|antagônic|conflitant)|(?:^|[\n•·*-]|:)\s*(?:SIM|NÃO)\s*[.,;:•]))(?=[\s\S]*\b3[ªa]\s*Turma(?!\s*(?:Recursal|C[íi]vel|Criminal|Regional|do\s+TRF|do\s+TJ|do\s+TRT)))(?=[\s\S]*\b4[ªa]\s*Turma(?!\s*(?:Recursal|C[íi]vel|Criminal|Regional|do\s+TRF|do\s+TJ|do\s+TRT)))|^(?=[\s\S]*(?:diverg|dividid|entendimentos?\s+(?:contr[áa]rios?|opostos?|diversos?)|posi(?:ção|ções)\s+(?:contr[áa]ri|opost|divergent|antagônic|conflitant)|(?:^|[\n•·*-]|:)\s*(?:SIM|NÃO)\s*[.,;:•]))(?=[\s\S]*\b5[ªa]\s*Turma(?!\s*(?:Recursal|C[íi]vel|Criminal|Regional|do\s+TRF|do\s+TJ|do\s+TRT)))(?=[\s\S]*\b6[ªa]\s*Turma(?!\s*(?:Recursal|C[íi]vel|Criminal|Regional|do\s+TRF|do\s+TJ|do\s+TRT)))|Tribunais Superiores diverg|(?:jurisprudência|STF|STJ|Supremo|Superior Tribunal|Corte|\d[ªa]\s*(?:Turma|Seção))[^.;!?]{0,60}está\s+dividid|divergência[\s.:;,–—-]{0,8}\d[ªa]\s*(?:Turma|Seção)|divergência\s+(?:n[oa]|d[oa])\s*(?:STF|STJ|Supremo|Superior Tribunal)|divergência\s+entre\s+(?:as?\s+)?(?:\d[ªa]\s*)?(?:Turmas?|Seções|Seção)/i,
  },
  {
    chave: 'vinculante',
    rotulo: 'Tese vinculante',
    campos: (t, r) => [t.en || '', t.fp || '', t.ob || ''].join('\n') + '\n@OG@' + (t.og || ''),
    re: /\d{4}\s*\.?\s*\(\s+Temas?\s+n?\.?\s*\d|(?:^|\n)[ \t]*(?:Temas?|IAC)\s+n?\.?\s*\d[^\n]{0,90}(?=\n|$)|^(?![\s\S]*@OG@[\s\S]*Turmas?(?![0-9A-Za-zÀ-ÖØ-öø-ÿ]))[\s\S]*?(?:^|[\n.;:)"”'’\]]\s*)Teses?\s+fixadas?(?:\s+pelo\s+STF|\s+para\s+fins\s+de\s+repercuss[ãa]o\s+geral)?\s*:/i,
  },
];

function marcar(t, r) {
  for (const m of MARCADORES) { try { if (m.re.test(m.campos(t, r))) return m.chave; } catch (_) {} }
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
    marcador: marcar(t, v),
  };
}).filter((x) => x.tese);

// O acervo repete a mesma tese em registros diferentes (edição extraordinária que republica
// o julgado, por exemplo). Sem isto o bloco mostrava a mesma coisa duas vezes seguidas.
const vistos = new Set();
const unicos = itens.filter((x) => {
  const k = x.tese.toLowerCase().replace(/\s+/g, ' ').slice(0, 160);
  if (vistos.has(k)) return false;
  vistos.add(k); return true;
});

// os marcados primeiro (é o que muda o estudo), depois os demais por data
const marcados = unicos.filter((x) => x.marcador);
const resto = unicos.filter((x) => !x.marcador);
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

console.log(`semana-juris.js: ${saida.length} itens (de ${inf.length} informativos, ${itens.length - unicos.length} repetidos descartados) · ${JSON.stringify(cont)}`);
console.log(`mais recente: ${saida[0] && saida[0].quando} · ${saida[0] && saida[0].titulo}`);
