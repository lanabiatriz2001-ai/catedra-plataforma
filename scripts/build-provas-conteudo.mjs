// scripts/build-provas-conteudo.mjs — extrai ENUNCIADO e ESPELHO dos PDFs das provas
// discursivas e injeta em discursivas.js.
//
// Por que: 560 das 632 provas do banco só tinham o LINK do PDF. Na tela de responder, a
// pessoa via os dados da prova (órgão, ano, banca) e nenhum enunciado — não dava para
// escrever nada. Aqui o texto entra no app, com a referência da prova de origem.
//
// Fonte: os próprios PDFs das bancas (CEBRASPE, FGV, TJs, OAB…), baixados dos endereços
// que já estavam no acervo. Documentos públicos de concurso.
//
// Uso: node scripts/build-provas-conteudo.mjs <pasta-provas> <pasta-espelhos>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DISC_ARQ = (() => { try { readFileSync(join(ROOT, 'discursivas-completo.js')); return 'discursivas-completo.js'; } catch { return 'discursivas.js'; } })();  // pós-split (21/08): a fonte íntegra é o -completo; rode build-discursivas-split.mjs depois
const [PROVAS, ESPELHOS] = process.argv.slice(2);
if (!PROVAS || !existsSync(PROVAS)) { console.error('uso: node scripts/build-provas-conteudo.mjs <provas> <espelhos>'); process.exit(1); }

const md5 = (s) => createHash('md5').update(String(s)).digest('hex').slice(0, 16);
const lerPdf = (f) => {
  try {
    return execFileSync('python3', ['-c',
      'import sys,fitz;print("\\n".join(p.get_text() for p in fitz.open(sys.argv[1])))', f],
      { encoding: 'utf8', maxBuffer: 96 * 1024 * 1024, timeout: 60000 });
  } catch { return ''; }
};

/** PDF com fonte de codificação própria devolve mojibake ("yyy/syDKZDhE"). Detecta pela
 *  ausência de palavras portuguesas comuns num texto que deveria ser jurídico. */
function textoLegivel(t) {
  if (!t || t.length < 400) return false;
  const amostra = t.slice(0, 6000).toLowerCase();
  const marcas = ['que', 'para', 'não', 'com', 'direito', 'art', 'sobre', 'como', 'deve'];
  const achou = marcas.filter((m) => amostra.includes(m)).length;
  return achou >= 4;
}

const limpa = (t) => String(t || '')
  .replace(/­/g, '')
  .replace(/^\s*(CEBRASPE|FGV|CESPE)[^\n]*\d+\/\d+\s*$/gim, '')
  .replace(/[ \t ]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

/** Onde a prova de fato começa: as primeiras páginas são capa e instruções. */
const RE_INICIO = /(PE[ÇC]A\s+PR[ÁA]TICO[-\s]PROFISSIONAL|QUEST[ÃA]O\s*(?:N?[º°.]?\s*)?0?1\b|DISSERTA[ÇC][ÃA]O|PROVA\s+DISCURSIVA\b(?!\s*P?\d*\s*,)|TEXTO\s+DEFINITIVO)/i;
const RE_LIXO = /(ATEN[ÇC][ÃA]O|VERIFIQUE SE|INSTRU[ÇC][ÕO]ES|APARELHOS ELETR[ÔO]NICOS|FISCAL DE SALA|CADERNO DE RASCUNHO|folha de texto definitivo|ser[áa] desconsiderado|AGUARDE A ORDEM|BOA SORTE|^NOME DO\(A\)|^RG\s*$|^INCRI[ÇC][ÃA]O\s*$|^PR[ÉE]DIO\s*$|^SALA\s*$)/i;

/** Enunciado: do primeiro marcador de questão/peça até o fim útil, sem as instruções. */
function extrairEnunciado(t) {
  const T = limpa(t);
  const m = RE_INICIO.exec(T);
  let corpo = m ? T.slice(m.index) : T;
  // corta blocos de instrução que sobrevivem no meio
  const paras = corpo.split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40 && !RE_LIXO.test(p));
  corpo = paras.join('\n\n').trim();
  if (corpo.length < 220) return '';
  return corpo.slice(0, 7000);
}

/** Espelho: quesitos com pontuação. Aceita "1. …  0,50", "QUESITO 1", "ITEM 1 …" */
function extrairEspelho(t) {
  const T = limpa(t);
  const linhas = T.split('\n').map((l) => l.trim()).filter(Boolean);
  const out = [];
  const reQ = /^(?:QUESITO|ITEM)?\s*(\d{1,2})\s*[.)\-–—]\s*(.{25,})$/i;
  const rePt = /(\d+[.,]\d{1,2})\s*(?:pontos?|pts?)?\s*$/i;
  for (const l of linhas) {
    const m = reQ.exec(l);
    if (!m) continue;
    const texto = m[2].trim();
    const p = rePt.exec(texto);
    const pontos = p ? parseFloat(p[1].replace(',', '.')) : null;
    if (texto.length < 25) continue;
    out.push({ quesito: texto.replace(rePt, '').trim().slice(0, 900), pontos, escala: p ? p[1] : '', disciplina: '', dispositivos: [] });
    if (out.length >= 40) break;
  }
  // só vale como espelho se tiver estrutura: 2+ quesitos e ao menos um com pontuação
  if (out.length < 2) return [];
  if (!out.some((q) => q.pontos != null)) return [];
  return out;
}

/** Fallback para espelhos sem quesito numerado (padrão CEBRASPE: prosa corrida sob
 *  "PADRÃO DE RESPOSTA DEFINITIVO"). Sem pontuação por item, mas com o texto oficial
 *  do que a banca aceitava como resposta — melhor que só o link do PDF. */
const RE_INICIO_ESP = /(PADR[ÃA]O\s+DE\s+RESPOSTA|GABARITO\s+(?:OFICIAL|DEFINITIVO)|ESPELHO\s+DE\s+CORRE[ÇC][ÃA]O)/i;
function extrairEspelhoTexto(t) {
  const T = limpa(t);
  const m = RE_INICIO_ESP.exec(T);
  let corpo = m ? T.slice(m.index) : T;
  const paras = corpo.split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40 && !RE_LIXO.test(p));
  corpo = paras.join('\n\n').trim();
  if (corpo.length < 220) return '';
  return corpo.slice(0, 9000);
}

globalThis.window = {};
new Function('window', readFileSync(join(ROOT, DISC_ARQ), 'utf8'))(globalThis.window);
const LISTA = globalThis.window.CT_DISCURSIVAS || [];

let comEnun = 0, comEsp = 0, comEspTexto = 0, ilegivel = 0, semArquivo = 0;
const cacheE = new Map(), cacheS = new Map();
for (const q of LISTA) {
  const precisaEnun = /Prova oficial|Enunciado na prova oficial|não publicou a prova|nao publicou a prova/i.test(q.enunciado || '');
  // fallback: registros antigos (dataset de espelhos) não têm fonte_prova — a URL está
  // embutida na ficha ("Prova oficial: <url>"), então extrai dali.
  const provaUrl = q.fonte_prova || (String(q.enunciado || '').match(/Prova oficial:\s*(\S+)/i) || [])[1] || '';
  // ---- enunciado
  if (precisaEnun && provaUrl) {
    const f = join(PROVAS, md5(provaUrl) + '.pdf');
    if (!existsSync(f)) semArquivo++;
    else {
      if (!cacheE.has(provaUrl)) {
        const t = lerPdf(f);
        cacheE.set(provaUrl, textoLegivel(t) ? extrairEnunciado(t) : (t ? '__ILEGIVEL__' : ''));
      }
      const e = cacheE.get(provaUrl);
      if (e === '__ILEGIVEL__') ilegivel++;
      else if (e) {
        q.enunciadoOriginal = q.enunciado;             // preserva a ficha da prova
        q.enunciado = e;
        q.temTexto = true;
        if (!q.fonte_prova) q.fonte_prova = provaUrl;
        comEnun++;
      }
    }
  }
  // ---- espelho
  if ((!q.espelho || !q.espelho.length) && !q.espelhoTexto && q.fonte_espelho && ESPELHOS) {
    const f = join(ESPELHOS, md5(q.fonte_espelho) + '.pdf');
    if (existsSync(f)) {
      if (!cacheS.has(q.fonte_espelho)) {
        const t = lerPdf(f);
        if (!textoLegivel(t)) cacheS.set(q.fonte_espelho, { estruturado: [], texto: '' });
        else cacheS.set(q.fonte_espelho, { estruturado: extrairEspelho(t), texto: extrairEspelhoTexto(t) });
      }
      const { estruturado, texto } = cacheS.get(q.fonte_espelho);
      if (estruturado && estruturado.length) {
        q.espelho = estruturado;
        q.total = Math.round(estruturado.reduce((s, x) => s + (x.pontos || 0), 0) * 100) / 100 || null;
        q.espelhoExtraido = true;
        comEsp++;
      } else if (texto) {
        // sem quesito numerado (padrão CEBRASPE em prosa) — guarda o texto oficial
        q.espelhoTexto = texto;
        q.espelhoExtraido = true;
        comEspTexto++;
      }
    }
  }
}

const src = readFileSync(join(ROOT, DISC_ARQ), 'utf8');
const cab = src.slice(0, src.indexOf('window.CT_DISCURSIVAS'));
writeFileSync(join(ROOT, DISC_ARQ), cab + 'window.CT_DISCURSIVAS = ' + JSON.stringify(LISTA, null, 1) + ';\n');
console.log(`enunciados extraídos: ${comEnun} · espelhos (quesito) extraídos: ${comEsp} · espelhos (texto) extraídos: ${comEspTexto}`);
console.log(`PDFs ilegíveis (fonte codificada): ${ilegivel} · sem arquivo baixado: ${semArquivo}`);
console.log(`banco: ${LISTA.length} provas · com texto: ${LISTA.filter((q) => q.temTexto || !/Prova oficial|Enunciado na prova/i.test(q.enunciado)).length} · com espelho: ${LISTA.filter((q) => q.espelho && q.espelho.length).length}`);
