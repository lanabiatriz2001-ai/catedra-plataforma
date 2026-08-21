// scripts/build-questoes-prova.mjs — converte questoes-simulado-magistratura-ago-2026.json
// (extração do TEC: questões de PROVAS OFICIAIS de magistratura, com gabarito e percentual
// de acerto; anuladas excluídas, comentários de professor NÃO copiados) no módulo
// questoes-prova.js (window.CT_QUESTOES_PROVA) que o Simulado carrega via <script> —
// fetch não funciona no bundle nativo (file://).
//
// Fonte primária: as próprias provas públicas (TJ-GO 2023/FGV, TJ-MA 2022/CEBRASPE).
// Uso: node scripts/build-questoes-prova.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = JSON.parse(readFileSync(join(ROOT, 'questoes-simulado-magistratura-ago-2026.json'), 'utf8'));

const lista = SRC.filter((q) => q && q.enunciado && q.gabarito && Array.isArray(q.alternativas) && q.alternativas.length >= 4 && !q.anulada)
  .map((q) => ({
    id: String(q.id_tec || ''),
    banca: String(q.banca || ''), ano: String(q.ano || ''), orgao: String(q.orgao || ''), cargo: String(q.cargo || ''),
    disciplina: String(q.disciplina || ''), assunto: String(q.assunto || ''),
    enunciado: String(q.enunciado || ''),
    alternativas: q.alternativas.map((a) => ({ letra: String(a.letra || ''), texto: String(a.texto || '') })),
    gabarito: String(q.gabarito || '').trim().toUpperCase(),
    pct: String(q.percentual_acerto || '').replace('%', '').trim(),
  }));

const header = `// questoes-prova.js — GERADO por scripts/build-questoes-prova.mjs. Não editar à mão.
// ${lista.length} questões de provas oficiais de magistratura estadual, com gabarito oficial
// e percentual de acerto. Consumido pelo Simulado (window.CT_QUESTOES_PROVA).
`;
writeFileSync(join(ROOT, 'questoes-prova.js'), header + 'window.CT_QUESTOES_PROVA=' + JSON.stringify(lista) + ';\n');
const porDisc = {};
for (const q of lista) porDisc[q.disciplina] = (porDisc[q.disciplina] || 0) + 1;
console.log(`questoes-prova.js: ${lista.length} questões ·`, Object.entries(porDisc).map(([k, v]) => `${k} ${v}`).join(' · '));
