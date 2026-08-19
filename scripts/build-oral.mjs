// scripts/build-oral.mjs — banco de MATERIAL OFICIAL DE PROVA ORAL.
//
// Fonte: scripts/fontes/acervo-prova-oral.html — levantamento da própria usuária nos sites
// OFICIAIS das bancas (CEBRASPE, FGV, comissões próprias) e no CNJ. 562 registros,
// 71 órgãos, 2009–2026.
//
// Tipos de material, do mais para o menos valioso no treino:
//   padrao_resposta_oral   o que a banca escreveu que esperava ouvir (125)
//   questoes_formuladas    as perguntas que efetivamente caíram (71)
//   relacao_de_pontos      os pontos sorteáveis do edital (37)
//   regulamento_criterios  como a banca pontua a oral (34)
//   edital_convocacao_oral / ata_resultado / gravacao   contexto
//
// Saída: oral.js (web, window.CT_ORAL) e oral.json (módulos nativos), AGRUPADOS POR
// CONCURSO — porque é assim que se treina: escolhe-se o concurso e abre-se o que a banca
// publicou para ele. Nada é transcrito: cada item leva o link do documento oficial.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'scripts/fontes/acervo-prova-oral.html'), 'utf8');
const ini = html.indexOf('const D=') + 'const D='.length;
let d = 0, fim = ini;
for (; fim < html.length; fim++) {
  const c = html[fim];
  if (c === '{') d++;
  else if (c === '}') { d--; if (!d) { fim++; break; } }
}
const REG = JSON.parse(html.slice(ini, fim)).registros || [];

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const PESO = { padrao_resposta_oral: 0, questoes_formuladas: 1, relacao_de_pontos: 2, regulamento_criterios: 3, edital_convocacao_oral: 4, ata_resultado: 5, gravacao: 6 };
const ROTULO = {
  padrao_resposta_oral: 'Padrão de resposta',
  questoes_formuladas: 'Perguntas formuladas',
  relacao_de_pontos: 'Pontos sorteáveis',
  regulamento_criterios: 'Critérios de avaliação',
  edital_convocacao_oral: 'Edital de convocação',
  ata_resultado: 'Ata / resultado',
  gravacao: 'Gravação da sessão',
};

// Agrupa por concurso (órgão + ano + cargo): é a unidade de treino.
const porConcurso = new Map();
for (const r of REG) {
  const k = norm(r.orgao) + '|' + (r.ano || '') + '|' + norm(r.cargo);
  if (!porConcurso.has(k)) {
    porConcurso.set(k, {
      id: k.replace(/\|/g, '-'),
      orgao: r.orgao || '', ano: r.ano || null, cargo: r.cargo || '',
      banca: r.banca || '', area: r.area || '', subarea: r.subarea || '',
      concurso: r.concurso || '', urlConcurso: r.url_concurso || '',
      materiais: [],
    });
  }
  const c = porConcurso.get(k);
  if (!c.urlConcurso && r.url_concurso) c.urlConcurso = r.url_concurso;
  if (!c.banca && r.banca) c.banca = r.banca;
  c.materiais.push({
    tipo: r.tipo_material || '', rotulo: ROTULO[r.tipo_material] || 'Material',
    titulo: r.titulo || '', url: r.url || '', obs: r.observacao || '',
  });
}

const lista = [...porConcurso.values()].map((c) => {
  c.materiais.sort((a, b) => (PESO[a.tipo] ?? 9) - (PESO[b.tipo] ?? 9) || a.titulo.localeCompare(b.titulo, 'pt'));
  c.tem = [...new Set(c.materiais.map((m) => m.tipo))];
  // "ouro" = tem padrão de resposta ou as perguntas formuladas: dá para treinar de verdade.
  c.ouro = c.tem.includes('padrao_resposta_oral') || c.tem.includes('questoes_formuladas');
  return c;
}).sort((a, b) => (b.ouro - a.ouro) || ((b.ano || 0) - (a.ano || 0)) || a.orgao.localeCompare(b.orgao, 'pt'));

const cab = `/* Cátedra — MATERIAL OFICIAL DE PROVA ORAL.
 *
 * ${REG.length} documentos de ${lista.length} concursos, 2009–2026, todos com link para o
 * arquivo publicado pela banca ou pelo órgão. Nada aqui é transcrição: o que o app guarda é
 * o CATÁLOGO (quem, quando, que tipo de material, onde está). O texto continua na fonte.
 *
 * Gerado por scripts/build-oral.mjs a partir de scripts/fontes/acervo-prova-oral.html.
 * Não editar à mão.
 */
`;
writeFileSync(join(ROOT, 'oral.js'), cab + 'window.CT_ORAL = ' + JSON.stringify(lista, null, 1) + ';\n');
writeFileSync(join(ROOT, 'oral.json'), JSON.stringify(lista));

const conta = (t) => REG.filter((r) => r.tipo_material === t).length;
console.log(`oral.js / oral.json: ${lista.length} concursos, ${REG.length} documentos`);
console.log(`  com padrão de resposta: ${conta('padrao_resposta_oral')} · perguntas formuladas: ${conta('questoes_formuladas')}`);
console.log(`  pontos sorteáveis: ${conta('relacao_de_pontos')} · critérios de avaliação: ${conta('regulamento_criterios')}`);
console.log(`  concursos "ouro" (padrão de resposta ou perguntas): ${lista.filter((c) => c.ouro).length}`);
const porSub = {};
for (const c of lista) porSub[c.subarea || '—'] = (porSub[c.subarea || '—'] || 0) + 1;
console.log('  carreiras:', Object.entries(porSub).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
