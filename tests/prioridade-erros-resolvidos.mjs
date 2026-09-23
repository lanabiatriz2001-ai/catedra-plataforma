import path from 'path';
import { fileURLToPath } from 'url';

await import('../prioridade-calc.js');

const CALC = globalThis.CT_PRIORIDADE_CALC;
const HOJE = '2026-09-23';
const RECENTE = Date.parse('2026-09-22T12:00:00Z');

function calcular(errosCivil) {
  return CALC.prioridadeDisciplinas({
    hoje: HOJE,
    edital: [
      { disc: 'Direito Civil', peso: 1 },
      { disc: 'Direito Penal', peso: 1 }
    ],
    errors: errosCivil.concat([
      { id: 'penal-1', disc: 'Direito Penal', ts: RECENTE },
      { id: 'penal-2', disc: 'Direito Penal', ts: RECENTE }
    ]),
    reviews: [],
    sessions: []
  }).find((item) => item.disc === 'Direito Civil');
}

export async function testarPrioridadeErrosResolvidos(ok) {
  const comResolvido = calcular([
    { id: 'civil-aberto', disc: 'Direito Civil', ts: RECENTE, resolvido: false },
    { id: 'civil-resolvido', disc: 'Direito Civil', ts: RECENTE, resolvido: true }
  ]);
  const doisAbertos = calcular([
    { id: 'civil-aberto-1', disc: 'Direito Civil', ts: RECENTE, resolvido: false },
    { id: 'civil-aberto-2', disc: 'Direito Civil', ts: RECENTE, resolvido: false }
  ]);

  ok(comResolvido.erros30 === 1,
    'PRIORIDADE erro resolvido não entra nos erros dos últimos 30 dias');
  ok(comResolvido.nota < doisAbertos.nota,
    'PRIORIDADE resolver um erro reduz a nota em relação a dois erros abertos');
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const falhas = [];
  await testarPrioridadeErrosResolvidos((cond, rotulo) => {
    console.log((cond ? '✓ ' : '✗ ') + rotulo);
    if (!cond) falhas.push(rotulo);
  });
  process.exit(falhas.length ? 1 : 0);
}
