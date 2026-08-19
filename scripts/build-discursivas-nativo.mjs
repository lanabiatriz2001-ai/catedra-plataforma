// scripts/build-discursivas-nativo.mjs — converte o banco de DISCURSIVAS/PEÇAS da web
// (discursivas.js, `window.CT_DISCURSIVAS = [...]`) para um JSON plano lido pelo módulo
// NATIVO (Swift) do CátedraJURIS — a aba "Simulado" sorteia daqui o bloco de discursivas.
//
// Entrada:  discursivas.js   (raiz do repo; fonte pública e oficial, transcrita da prova)
// Saída:    discursivas.json — [{id, tipo, peca, banca, orgao, cargo, ano, fase,
//                               disciplina, tema, enunciado, espelho:[{quesito,pontos}],
//                               total, fonte}]
//
// Não vai à rede e não inventa dado: o "padrão de resposta" do nativo é o ESPELHO que a
// banca publicou (quesito + pontos). Quando a banca não publicou, `espelho` sai vazio e
// o app diz isso em vez de fingir gabarito.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = globalThis.window || {};
new Function('window', readFileSync(join(ROOT, 'discursivas.js'), 'utf8'))(globalThis.window);

const SRC = globalThis.window.CT_DISCURSIVAS || [];
if (!SRC.length) throw new Error('discursivas.js não trouxe questão nenhuma');

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v) => (v == null ? '' : String(v));

const out = SRC.map((q) => ({
  id: str(q.id),
  tipo: str(q.tipo || 'discursiva'),
  peca: str(q.peca),
  banca: str(q.banca),
  orgao: str(q.orgao),
  cargo: str(q.cargo),
  ano: num(q.ano),
  fase: str(q.fase),
  disciplina: str(q.disciplina),
  tema: str(q.tema),
  enunciado: str(q.enunciado),
  espelho: Array.isArray(q.espelho)
    ? q.espelho.map((e) => ({ quesito: str(e.quesito), pontos: num(e.pontos) }))
    : [],
  total: num(q.total),
  fonte: str(q.fonte),
})).filter((q) => q.id && q.enunciado);

const dest = join(ROOT, 'discursivas.json');
writeFileSync(dest, JSON.stringify(out));
const comEspelho = out.filter((q) => q.espelho.length).length;
console.log(`discursivas.json: ${out.length} questões (${comEspelho} com espelho publicado) → ${dest}`);
