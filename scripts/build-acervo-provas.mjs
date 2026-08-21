// scripts/build-acervo-provas.mjs — funde o ACERVO DE PROVAS DISCURSIVAS + ESPELHOS
// (585 provas catalogadas, 564 com espelho oficial, 145 órgãos, 16 bancas, 10 áreas)
// ao banco que a Redação carrega (discursivas.js → window.CT_DISCURSIVAS).
//
// Fonte: scripts/fontes/acervo-provas-discursivas-espelhos.html — levantamento feito pela
// própria usuária a partir dos sites OFICIAIS das bancas (CEBRASPE, FGV, FCC, VUNESP…).
// Cada registro traz o link do PDF da prova, do espelho e da página do concurso.
//
// O que entra e como:
//   · registro COM quesitos já transcritos (os 566 do banco de espelhos) → item completo,
//     com espelho ponto a ponto na escala da banca. Esses já vieram por build-espelhos.mjs;
//     aqui só completamos o que faltar (área, subárea, links).
//   · registro SEM quesitos transcritos → item de PROVA CADASTRADA: enunciado aponta para o
//     PDF oficial, e o espelho fica como link. A pessoa lê a prova na fonte, escreve no app,
//     e cola/abre o espelho na correção. Nada é inventado — não há transcrição inventada.
//
// Dedup por órgão+ano+cargo+tipo normalizados. Item já existente NUNCA é sobrescrito.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DISC_ARQ = (() => { try { readFileSync(join(ROOT, 'discursivas-completo.js')); return 'discursivas-completo.js'; } catch { return 'discursivas.js'; } })();  // pós-split (21/08): a fonte íntegra é o -completo; rode build-discursivas-split.mjs depois
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

// ---- ler o acervo do HTML (const D={...})
const html = readFileSync(join(ROOT, 'scripts/fontes/acervo-provas-discursivas-espelhos.html'), 'utf8');
const ini = html.indexOf('const D=') + 'const D='.length;
let d = 0, fim = ini;
for (; fim < html.length; fim++) {
  const c = html[fim];
  if (c === '{') d++;
  else if (c === '}') { d--; if (!d) { fim++; break; } }
}
const ACERVO = JSON.parse(html.slice(ini, fim));
const REG = ACERVO.registros || [];
const QUE = ACERVO.quesitos || [];

// quesitos indexados por prova (tribunal+ano+tipo) — os que têm espelho transcrito
const porProva = {};
for (const q of QUE) {
  const k = norm(q.t) + '|' + q.a;
  (porProva[k] = porProva[k] || []).push(q);
}

globalThis.window = {};
const srcJs = readFileSync(join(ROOT, DISC_ARQ), 'utf8');
new Function('window', srcJs)(globalThis.window);
const atual = globalThis.window.CT_DISCURSIVAS || [];

// Dedup por URL, não por órgão+ano+cargo: um mesmo concurso tem VÁRIAS provas (PGE-PA 2023
// tem 4 — fases e cargos distintos), e a chave grosseira descartava 272 provas legítimas.
// A URL do espelho (ou da prova) identifica o documento; é o que não pode repetir.
const urlKey = (u) => String(u || '').trim().toLowerCase();
const existentes = new Set();
for (const q of atual) {
  for (const u of [q.fonte, q.fonte_espelho, q.fonte_prova]) if (u) existentes.add(urlKey(u) + '§' + norm(q.cargo));
}

// carreira derivada da subárea/cargo — é o que a Redação usa para filtrar
function carreiraDe(r) {
  const s = (r.subarea || '') + ' ' + (r.cargo || '');
  const n = norm(s);
  if (n.includes('juiz') || n.includes('magistrad')) return /federal|trf|trt|tre/i.test(r.orgao) ? 'Magistratura federal' : 'Magistratura estadual';
  if (n.includes('promotor') || n.includes('procuradordejustica') || n.includes('ministeriopublico')) return 'Ministério Público';
  if (n.includes('defensor')) return 'Defensoria Pública';
  if (n.includes('procurador')) return 'Advocacia Pública';
  if (n.includes('delegado')) return 'Delegado de Polícia';
  if (n.includes('auditor')) return 'Auditoria e Controle';
  if (n.includes('analista') || n.includes('tecnico')) return 'Analista / Técnico';
  return r.subarea || r.area || 'Outras carreiras';
}
const ehSentenca = (r) => /senten[çc]a|pr[áa]tica de senten|pe[çc]a/i.test((r.tipo_prova || '') + ' ' + (r.observacao || ''));

const novos = [];
let comQuesitos = 0;
for (const r of REG) {
  const tipo = ehSentenca(r) ? 'sentenca' : 'discursiva';
  // Duas provas só são a MESMA quando prova, espelho e cargo coincidem: um espelho único
  // costuma cobrir vários cargos do mesmo edital, e cada cargo é uma prova diferente.
  const k = [urlKey(r.url_prova), urlKey(r.url_espelho), norm(r.cargo), norm(r.tipo_prova)].join('§');
  if (existentes.has(k)) continue;
  // contra o banco já existente, o que não pode repetir é o PDF do espelho com o mesmo cargo
  const jaTem = r.url_espelho && existentes.has(urlKey(r.url_espelho) + '§' + norm(r.cargo));
  if (jaTem) continue;
  existentes.add(k);
  if (r.url_espelho) existentes.add(urlKey(r.url_espelho) + '§' + norm(r.cargo));
  const qs = porProva[norm(r.orgao) + '|' + r.ano] || [];
  if (qs.length) comQuesitos++;
  const n = String(novos.filter((x) => x.orgao === r.orgao && x.ano === r.ano).length + 1);
  novos.push({
    id: norm(r.orgao) + '-' + (r.ano || 's') + '-ac' + n,   // n conta por órgão+ano, então fases distintas ganham ac1, ac2…
    tipo, peca: tipo === 'sentenca' ? 'Peça / sentença' : '',
    carreira: carreiraDe(r),
    area: r.area || '', subarea: r.subarea || '',
    banca: r.banca || '', orgao: r.orgao || '', cargo: r.cargo || '', ano: r.ano || null,
    fase: r.tipo_prova || '',
    disciplina: qs.length ? [...new Set(qs.map((q) => q.d).filter(Boolean))].join(', ') : (r.subarea || r.area || ''),
    tema: qs.length ? qs.slice(0, 3).map((q) => q.tm).filter(Boolean).join('; ') : (r.concurso || `${r.orgao} ${r.ano || ''}`),
    // Sem transcrição inventada: o enunciado é o cartão da prova + o link oficial.
    enunciado: [
      `${r.orgao} · ${r.ano || ''} · ${r.cargo || ''}${r.banca ? (/^banca/i.test(r.banca) ? ' — ' + r.banca : ' — banca ' + r.banca) : ''}.`,
      r.url_prova ? `Prova oficial (PDF): ${r.url_prova}` : 'A banca não publicou o PDF da prova nesta página.',
      r.url_espelho ? `Espelho oficial (PDF): ${r.url_espelho}` : '',
      r.url_concurso ? `Página do concurso: ${r.url_concurso}` : '',
      r.observacao ? `Observação: ${r.observacao}` : '',
      tipo === 'sentenca' ? 'Tempo sugerido: 4h.' : 'Tempo sugerido: 1h por questão.',
    ].filter(Boolean).join('\n'),
    espelho: qs.map((q) => ({
      quesito: [q.r, q.tm].filter(Boolean).join(' — ') + (q.ex ? ': ' + q.ex : ''),
      pontos: (() => { const ns = (String(q.p || '').replace(/,/g, '.').match(/\d+(?:\.\d+)?/g) || []).map(Number); return ns.length ? Math.max(...ns) : null; })(),
      escala: q.p || '', disciplina: q.d || '', dispositivos: q.disp || [],
    })),
    total: (() => {
      const t = qs.reduce((s, q) => { const ns = (String(q.p || '').replace(/,/g, '.').match(/\d+(?:\.\d+)?/g) || []).map(Number); return s + (ns.length ? Math.max(...ns) : 0); }, 0);
      return t ? Math.round(t * 100) / 100 : null;
    })(),
    instrucoes: [],
    fonte: r.url_espelho || r.url_prova || r.url_concurso || '',
    fonte_prova: r.url_prova || '', fonte_espelho: r.url_espelho || '', fonte_concurso: r.url_concurso || '',
    nota: r.tem_espelho ? '' : 'Esta banca não publicou espelho para esta prova.',
  });
}

const lista = [...atual, ...novos];
const cab = srcJs.slice(0, srcJs.indexOf('window.CT_DISCURSIVAS'));
writeFileSync(join(ROOT, DISC_ARQ), cab + 'window.CT_DISCURSIVAS = ' + JSON.stringify(lista, null, 1) + ';\n');
console.log(`discursivas.js: ${atual.length} + ${novos.length} do acervo = ${lista.length} provas`);
console.log(`  com espelho ponto a ponto: ${lista.filter((q) => q.espelho && q.espelho.length).length}`);
console.log(`  com link do espelho oficial: ${lista.filter((q) => q.fonte_espelho).length}`);
const porCarreira = {};
for (const q of lista) porCarreira[q.carreira || '—'] = (porCarreira[q.carreira || '—'] || 0) + 1;
console.log('  carreiras:', Object.entries(porCarreira).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
