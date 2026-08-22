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
// A extração em si mora em scripts/extrair_prova.py (a receita da auditoria: moldura fora,
// página de regulamento fora, corte no marcador de início, espelho por find_tables). Aqui
// ficam só a decisão de o que publicar e o registro honesto do que não deu para publicar.
//
// Uso: node scripts/build-provas-conteudo.mjs <pasta-provas> <pasta-espelhos> [--sem-portao]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { audita, juntaEspelho } from './qualidade-texto.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DISC_ARQ = (() => { try { readFileSync(join(ROOT, 'discursivas-completo.js')); return 'discursivas-completo.js'; } catch { return 'discursivas.js'; } })();  // pós-split (21/08): a fonte íntegra é o -completo; rode build-discursivas-split.mjs depois
const argv = process.argv.slice(2);
const SEM_PORTAO = argv.includes('--sem-portao');
const [PROVAS, ESPELHOS] = argv.filter((a) => !a.startsWith('--'));
// As DUAS pastas são obrigatórias. Com o 2º argumento opcional, rodar só com as provas
// apagava os 503 espelhos já publicados (o reset abaixo limpa antes de reextrair) e o
// build ainda saía verde — espelho ausente conta como "sem espelho", nunca como reprovado.
if (!PROVAS || !existsSync(PROVAS) || !ESPELHOS || !existsSync(ESPELHOS)) {
  console.error('uso: node scripts/build-provas-conteudo.mjs <pasta-provas> <pasta-espelhos>');
  console.error('  as duas pastas são obrigatórias: sem a de espelhos, o reprocessamento apagaria os espelhos publicados.');
  process.exit(1);
}

// ===== B4: falha NOSSA não é característica do PDF da banca =====
// O catch de lerPdf cobria python3 ausente, PyMuPDF faltando, timeout e JSON inválido — e
// tudo isso virava `ilegivel`, que a tela mostra como "o PDF usa fonte codificada". Com o
// fitz ausente, o build marcava 600 provas legíveis como ilegíveis e saía com código 0.
try {
  execFileSync('python3', ['-c', 'import fitz'], { stdio: 'pipe' });
} catch {
  console.error('\n✗ ABORTADO — python3 com PyMuPDF (fitz) não está disponível.');
  console.error('  Sem ele nada pode ser extraído, e seguir marcaria PDF legível como');
  console.error('  "ilegível" no acervo. Instale com: python3 -m pip install pymupdf\n');
  process.exit(1);
}

const md5 = (s) => createHash('md5').update(String(s)).digest('hex').slice(0, 16);
const RECEITA = join(ROOT, 'scripts', 'extrair_prova.py');

/** Roda a receita de extração sobre um PDF. Devolve {texto, paginas, escaneado, tabelas}. */
const lerPdf = (f, modo) => {
  try {
    const saida = execFileSync('python3', [RECEITA, f, modo],
      { encoding: 'utf8', maxBuffer: 96 * 1024 * 1024, timeout: 180000 });
    return JSON.parse(saida);
  } catch { return { texto: '', paginas: 0, escaneado: false, tabelas: 0, falhou: true }; }
};

/** Por que um texto não pôde ser publicado — em uma palavra, para a tela dizer a verdade.
 *
 *  A régua de recusa é a MESMA do portão (`qualidade-texto.mjs`). Publicar por um critério
 *  e auditar por outro deixaria o portão vermelho sem conserto possível.
 */
function situacao(r) {
  if (r.falhou) return 'ilegivel';
  if (r.escaneado || !r.texto) return 'escaneado';
  const sintomas = audita(r.texto);
  if (sintomas.includes('curto')) return 'escaneado';
  // mojibake é ASCII ("yyy/syDKZDhE"): a régua de caracteres não o pega, só a ausência
  // de palavras portuguesas — e essa checagem precisa de texto suficiente para valer.
  // Só a partir de 400 chars, que é a régua do textoLegivel: entre 300 e 399 ele diz
  // "não" por falta de amostra, não por defeito, e o texto (que o portão aprovaria)
  // acabava recusado e rotulado "fonte codificada" na tela.
  if (r.texto.length >= 400 && !textoLegivel(r.texto)) return 'ilegivel';
  if (sintomas.length) return 'deformado';
  return '';
}

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

globalThis.window = {};
new Function('window', readFileSync(join(ROOT, DISC_ARQ), 'utf8'))(globalThis.window);
const LISTA = globalThis.window.CT_DISCURSIVAS || [];

let comEnun = 0, comEsp = 0, comEspTexto = 0, semArquivo = 0;
const recusados = {};                       // situação -> quantas
const conta = (s) => { if (s) recusados[s] = (recusados[s] || 0) + 1; };
const cacheE = new Map(), cacheS = new Map();

// Reprocessamento: a rodada anterior publicou texto deformado em 267 provas, e a ficha
// original ficou guardada em `enunciadoOriginal`. Restaurar a ficha antes de reextrair é o
// que permite rodar de novo — sem isso, a prova "já tem enunciado" e nunca seria revista.
//
// O ESPELHO precisa da mesma rede. Ele era limpo antes de se saber se dava para reextrair:
// PDF que sumiu da pasta (o /tmp é purgado), python que falhou, extração que piorou — em
// qualquer desses o espelho publicado ia embora e nada o trazia de volta. Agora ele é
// guardado em `_espelhoAnterior` e devolvido quando a reextração não acontece ou não presta.
const anterior = new Map();
for (const q of LISTA) {
  if (q.enunciadoOriginal) { q.enunciado = q.enunciadoOriginal; delete q.enunciadoOriginal; }
  delete q.temTexto; delete q.textoSituacao; delete q.espelhoSituacao;
  if (q.espelhoExtraido) {
    anterior.set(q, { espelho: Array.isArray(q.espelho) ? q.espelho : [],
                      total: q.total, texto: q.espelhoTexto || '' });
    delete q.espelhoExtraido; delete q.espelhoTexto;
    if (Array.isArray(q.espelho)) { q.espelho = []; q.total = null; }
  }
}

/** Devolve o espelho que estava publicado. Melhor o de ontem que nenhum. */
function devolverEspelho(q, porque) {
  const a = anterior.get(q);
  if (!a || (!a.texto && !(a.espelho && a.espelho.length))) return false;
  if (a.espelho && a.espelho.length) { q.espelho = a.espelho; q.total = a.total; }
  if (a.texto) q.espelhoTexto = a.texto;
  q.espelhoExtraido = true;
  q.espelhoPreservado = porque;          // a tela pode dizer que este é o texto da rodada anterior
  return true;
}

for (const q of LISTA) {
  const precisaEnun = /Prova oficial|Enunciado na prova oficial|não publicou a prova|nao publicou a prova/i.test(q.enunciado || '');
  // fallback: registros antigos (dataset de espelhos) não têm fonte_prova — a URL está
  // embutida na ficha ("Prova oficial: <url>"), então extrai dali.
  const provaUrl = q.fonte_prova || (String(q.enunciado || '').match(/Prova oficial:\s*(\S+)/i) || [])[1] || '';
  // ---- enunciado
  if (precisaEnun && provaUrl) {
    const f = join(PROVAS, md5(provaUrl) + '.pdf');
    if (!existsSync(f)) { semArquivo++; q.textoSituacao = 'sem-pdf'; }
    else {
      if (!cacheE.has(provaUrl)) {
        const r = lerPdf(f, 'enunciado');
        const mal = situacao(r);
        cacheE.set(provaUrl, mal ? { mal } : { texto: r.texto.slice(0, 7000) });
      }
      const e = cacheE.get(provaUrl);
      if (e.mal) { q.textoSituacao = e.mal; conta(e.mal); }
      else {
        q.enunciadoOriginal = q.enunciado;             // preserva a ficha da prova
        q.enunciado = e.texto;
        q.temTexto = true;
        if (!q.fonte_prova) q.fonte_prova = provaUrl;
        comEnun++;
      }
    }
  }
  // ---- espelho
  const jaTemEspelho = (q.espelho && q.espelho.length) || q.espelhoTexto;
  if (!jaTemEspelho && !q.fonte_espelho) {
    // A banca não publicou espelho para esta prova. Não é falha da extração, e a tela
    // precisa dizer as duas coisas com palavras diferentes.
    q.espelhoSituacao = 'nao-publicado';
  } else if (!jaTemEspelho && ESPELHOS) {
    const f = join(ESPELHOS, md5(q.fonte_espelho) + '.pdf');
    if (!existsSync(f)) { if (!devolverEspelho(q, 'sem-pdf')) q.espelhoSituacao = 'sem-pdf'; }
    else {
      if (!cacheS.has(q.fonte_espelho)) {
        const r = lerPdf(f, 'espelho');
        // Os QUESITOS vêm primeiro: quando a banca publicou o espelho em tabela, os
        // quesitos estruturados são o produto bom mesmo que a prosa da página seja curta
        // ou suja. Descartá-los por causa da prosa jogaria fora o melhor que temos.
        const estruturado = r.texto ? extrairEspelho(r.texto) : [];
        if (estruturado.length >= 2 && !audita(juntaEspelho(estruturado)).length) {
          cacheS.set(q.fonte_espelho, { estruturado });
        } else {
          const mal = situacao(r);
          cacheS.set(q.fonte_espelho, mal ? { mal } : { texto: r.texto.slice(0, 9000) });
        }
      }
      const { mal, estruturado, texto } = cacheS.get(q.fonte_espelho);
      if (mal) { if (!devolverEspelho(q, mal)) q.espelhoSituacao = mal; conta(mal); }
      else if (estruturado && estruturado.length) {
        q.espelho = estruturado;
        q.total = Math.round(estruturado.reduce((s, x) => s + (x.pontos || 0), 0) * 100) / 100 || null;
        q.espelhoExtraido = true;
        comEsp++;
      } else if (texto) {
        // sem quesito numerado (padrão CEBRASPE em prosa) — guarda o texto oficial
        q.espelhoTexto = texto;
        q.espelhoExtraido = true;
        comEspTexto++;
      } else if (!devolverEspelho(q, 'escaneado')) q.espelhoSituacao = 'escaneado';
    }
  }
}

// Gravar é a última coisa. Antes, o resultado passa pela MESMA régua do portão — e, se
// reprovar, o acervo publicado fica como estava. Escrever primeiro e auditar depois
// deixava um acervo pior no disco mesmo quando o build falhava.
const reprovadosAgora = [];
for (const q of LISTA) {
  if (q.temTexto) {
    const p = audita(String(q.enunciado || ''));
    if (p.length) reprovadosAgora.push(q.id + ' (enunciado: ' + p.join(', ') + ')');
  }
  const esp = juntaEspelho(q.espelho) || String(q.espelhoTexto || '');
  if (esp.trim()) {
    const p = audita(esp);
    if (p.length) reprovadosAgora.push(q.id + ' (espelho: ' + p.join(', ') + ')');
  }
}
if (reprovadosAgora.length) {
  console.error(`\n✗ NADA FOI GRAVADO — ${reprovadosAgora.length} textos reprovariam na régua:`);
  reprovadosAgora.slice(0, 10).forEach((x) => console.error('    ' + x));
  console.error('  O acervo publicado continua como estava.\n');
  process.exit(1);
}

const src = readFileSync(join(ROOT, DISC_ARQ), 'utf8');
const cab = src.slice(0, src.indexOf('window.CT_DISCURSIVAS'));
writeFileSync(join(ROOT, DISC_ARQ), cab + 'window.CT_DISCURSIVAS = ' + JSON.stringify(LISTA, null, 1) + ';\n');
console.log(`enunciados extraídos: ${comEnun} · espelhos (quesito) extraídos: ${comEsp} · espelhos (texto) extraídos: ${comEspTexto}`);
console.log(`banco: ${LISTA.length} provas · com texto: ${LISTA.filter((q) => q.temTexto || !/Prova oficial|Enunciado na prova/i.test(q.enunciado)).length} · com espelho: ${LISTA.filter((q) => (q.espelho && q.espelho.length) || q.espelhoTexto).length}`);
console.log(`sem arquivo baixado: ${semArquivo} · recusados pelo portão: ${JSON.stringify(recusados)}`);

// O split precisa rodar antes do portão: a auditoria lê discursivas-textos.js, que é
// justamente o que o split produz. Auditar antes seria auditar a rodada passada.
execFileSync('node', [join(ROOT, 'scripts', 'build-discursivas-split.mjs')], { stdio: 'inherit' });

if (!SEM_PORTAO) {
  // Portão de qualidade: texto deformado não é publicado (foi recusado acima), então o
  // portão só pode ficar vermelho se algo escapou — e aí o build FALHA, de propósito.
  execFileSync('node', [join(ROOT, 'scripts', 'auditar-provas.mjs'), '--portao'], { stdio: 'inherit' });
}
