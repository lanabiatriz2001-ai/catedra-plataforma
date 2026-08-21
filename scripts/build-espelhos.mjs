// scripts/build-espelhos.mjs — funde o banco de ESPELHOS DE CORREÇÃO oficiais
// (scripts/fontes/espelhos-magistratura.json: 35 espelhos, 566 quesitos, 11 tribunais,
// 2021-2025, todos lidos do PDF publicado pela banca) no banco de discursivas da web
// (discursivas.js → window.CT_DISCURSIVAS), que é o que a Redação carrega no compositor
// e o que o Simulado nativo sorteia.
//
// O que muda em relação ao banco que já existia: ali cada item tinha o ENUNCIADO
// transcrito; aqui a fonte traz só o LINK da prova + o espelho por quesito com a
// pontuação na escala da banca. Então o item entra com `enunciado` apontando para a prova
// oficial e `espelho` completo, e ganha dois campos novos que a Redação vai usar para
// corrigir "por quesito, na escala da banca":
//   escala     texto da pontuação como a banca redigiu ("0,00/0,10/0,20/0,30", "até 0,40")
//   dispositivos  fundamentos que o espelho exige naquele quesito
//   instrucoes  regras gerais da banca (desconto por forma, item residual etc.)
//
// Regra do treino: o espelho NÃO pode ser revelado antes de a pessoa entregar a peça —
// isso é tratado na tela (campo ③ escondido até enviar), não aqui.
//
// Merge por orgao+ano+tipo normalizado: item que já existe em discursivas.js com
// enunciado transcrito NÃO é substituído (enunciado transcrito > link), só ganha os
// campos novos se ainda não tiver.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DISC_ARQ = (() => { try { readFileSync(join(ROOT, 'discursivas-completo.js')); return 'discursivas-completo.js'; } catch { return 'discursivas.js'; } })();  // pós-split (21/08): a fonte íntegra é o -completo; rode build-discursivas-split.mjs depois
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

globalThis.window = {};
const srcJs = readFileSync(join(ROOT, DISC_ARQ), 'utf8');
new Function('window', srcJs)(globalThis.window);
const atual = globalThis.window.CT_DISCURSIVAS || [];
const fonte = JSON.parse(readFileSync(join(ROOT, 'scripts/fontes/espelhos-magistratura.json'), 'utf8'));

// Pontuação "1,00 (0,15 / 0,20 ...)", "0,40", "até 0,40", "0,00 / 0,75 / 1,50" → o valor
// do quesito é o MÁXIMO da escala (a primeira versão pegava o primeiro número e zerava
// todo espelho escrito como "0,00 / … / 1,50").
function pontosDe(p) {
  const ns = (String(p || '').replace(/,/g, '.').match(/\d+(?:\.\d+)?/g) || []).map(parseFloat);
  return ns.length ? Math.max(...ns) : null;
}
const tipoDe = (t) => /senten/i.test(t) ? 'sentenca' : 'discursiva';
const pecaDe = (t) => {
  const s = norm(t);
  if (s.includes('civel') && (s.includes('penal') || s.includes('criminal'))) return 'Sentença cível e penal';
  if (s.includes('civel')) return 'Sentença cível';
  if (s.includes('penal') || s.includes('criminal')) return 'Sentença penal';
  return '';
};

const chaves = new Set(atual.map((q) => norm(q.orgao) + '|' + q.ano + '|' + norm(q.tipo || 'discursiva') + '|' + norm(q.peca)));
const novos = [];
for (const e of fonte.espelhos) {
  const tipo = tipoDe(e.tipo), peca = pecaDe(e.tipo);
  const chave = norm(e.tribunal) + '|' + e.ano + '|' + tipo + '|' + norm(peca);
  if (chaves.has(chave)) continue;
  chaves.add(chave);
  const total = Math.round(e.quesitos.reduce((s, q) => s + (pontosDe(q.pontuacao) || 0), 0) * 100) / 100;
  const discs = [...new Set(e.quesitos.map((q) => q.disciplina).filter(Boolean))];
  // Prova DISCURSIVA cujos quesitos são rotulados Q01, Q02… com disciplinas distintas não é
  // uma peça só: são N QUESTÕES INDEPENDENTES. Tratá-las como um item único fazia a pessoa
  // responder 10 questões numa caixa e tirar 1/10 da nota. Aqui cada questão vira um item,
  // com o seu próprio espelho e a sua própria pontuação.
  const rotQ = (q) => /^Q\s*\d+$/i.test(String(q.rotulo || '').trim());
  const independentes = tipo === 'discursiva' && e.quesitos.length > 1 && e.quesitos.every(rotQ)
    && new Set(e.quesitos.map((q) => q.disciplina || '')).size > 1;
  if (independentes) {
    e.quesitos.forEach((q, i) => {
      const pts = pontosDe(q.pontuacao);
      novos.push({
        id: norm(e.tribunal).replace(/^(tj|trf)/, '$1-') + '-' + e.ano + '-q' + String(i + 1).padStart(2, '0'),
        tipo: 'discursiva', peca: '',
        carreira: /^trf/i.test(e.tribunal) ? 'Magistratura federal' : 'Magistratura estadual',
        banca: e.banca || '', orgao: e.tribunal, cargo: e.cargo || 'Juiz Substituto', ano: e.ano,
        fase: e.tipo + ' — questão ' + (i + 1) + ' de ' + e.quesitos.length,
        disciplina: q.disciplina || '',
        tema: q.tema || '',
        enunciado: [
          `${e.tribunal} · ${e.ano} · ${e.cargo || 'Juiz Substituto'}${e.banca ? (/^banca/i.test(e.banca) ? ' — ' + e.banca : ' — banca ' + e.banca) : ''} · questão ${i + 1} de ${e.quesitos.length}.`,
          q.disciplina ? `Disciplina: ${q.disciplina}.` : '',
          q.tema ? `Tema: ${q.tema}.` : '',
          e.url_prova ? `Enunciado na prova oficial: ${e.url_prova}` : 'A banca não publicou a prova em PDF autônomo.',
          `Espelho oficial: ${e.url}`,
          'Responda em até 15 linhas.',
        ].filter(Boolean).join('\n'),
        espelho: [{ quesito: [q.rotulo, q.tema].filter(Boolean).join(' — ') + (q.exigencia ? ': ' + q.exigencia : ''),
                    pontos: pts, escala: q.pontuacao || '', disciplina: q.disciplina || '', dispositivos: q.dispositivos || [] }],
        total: pts, instrucoes: e.instrucoes_gerais || [],
        fonte: e.url, fonte_espelho: e.url, fonte_prova: e.url_prova || '', fonte_concurso: e.url_concurso || '',
        nota: e.nota || '',
      });
    });
    continue;
  }
  const n = String(novos.filter((x) => x.orgao === e.tribunal && x.ano === e.ano).length + 1);
  novos.push({
    id: norm(e.tribunal).replace(/^(tj|trf)/, '$1-') + '-' + e.ano + '-esp' + n,
    tipo, peca,
    carreira: /^trf/i.test(e.tribunal) ? 'Magistratura federal' : 'Magistratura estadual',
    banca: e.banca || '', orgao: e.tribunal, cargo: e.cargo || 'Juiz Substituto', ano: e.ano,
    fase: e.tipo,
    disciplina: discs.join(', '),
    tema: e.quesitos.slice(0, 3).map((q) => q.tema).filter(Boolean).join('; ') + (e.quesitos.length > 3 ? '; …' : ''),
    // A fonte não traz o enunciado transcrito: a prova oficial é o link. O compositor
    // mostra isso como "abra a prova, escreva aqui, e só então veja o espelho".
    enunciado: [
      `${e.tribunal} · ${e.ano} · ${e.cargo || 'Juiz Substituto'} — ${e.tipo}${e.banca ? ' (banca ' + e.banca + ')' : ''}.`,
      e.url_prova ? `Prova oficial: ${e.url_prova}` : 'A banca não publicou a prova em PDF autônomo.',
      e.url_prova2 ? `Segunda peça: ${e.url_prova2}` : '',
      `Espelho oficial: ${e.url}`,
      tipo === 'sentenca' ? 'Tempo sugerido: 4h.' : `Tempo sugerido: 1h por questão (${e.quesitos.length} quesitos).`,
    ].filter(Boolean).join('\n'),
    espelho: e.quesitos.map((q) => ({
      quesito: [q.rotulo, q.tema].filter(Boolean).join(' — ') + (q.exigencia ? ': ' + q.exigencia : ''),
      pontos: pontosDe(q.pontuacao),
      escala: q.pontuacao || '',
      disciplina: q.disciplina || '',
      dispositivos: q.dispositivos || [],
    })),
    total: total || null,
    instrucoes: e.instrucoes_gerais || [],
    fonte: e.url,
    fonte_concurso: e.url_concurso || '',
    nota: e.nota || '',
  });
}

const lista = [...atual, ...novos];
const cab = srcJs.slice(0, srcJs.indexOf('window.CT_DISCURSIVAS'));
writeFileSync(join(ROOT, DISC_ARQ), cab + 'window.CT_DISCURSIVAS = ' + JSON.stringify(lista, null, 1) + ';\n');
console.log(`discursivas.js: ${atual.length} existentes + ${novos.length} espelhos oficiais = ${lista.length} itens`);
console.log(`  quesitos adicionados: ${novos.reduce((s, x) => s + x.espelho.length, 0)}`);
console.log(`  não localizados registrados na fonte: ${(fonte.nao_localizados || []).length} (não entram)`);
