// scripts/lib/planalto.mjs — leitura do texto compilado do Planalto, em artigos.
//
// Por que existe: dois consumidores precisam EXATAMENTE do mesmo recorte do texto — o build
// do acervo de lei seca (scripts/build-leis-seca.mjs, que importa daqui catalogo, limparHTML
// e melhorParse) e o sentinela (scripts/sentinela.mjs), que compara o texto de hoje com o
// acervo. Se cada um tivesse o seu parser, a primeira divergência viraria "alteração" falsa:
// a pessoa estudaria uma mudança que nunca aconteceu. Um parser só (a régua confere no S16).
//
// Fonte: planalto.gov.br (texto compilado oficial). Só o que a lei diz — domínio público.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buscarFonte } from './tls-fontes.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36';

/** Catálogo de leis do CátedraLEGIS: o que o app conhece por título, referência e URL. */
export function catalogo() {
  const html = readFileSync(join(ROOT, 'legis-web.html'), 'utf8');
  const i = html.indexOf('const CAT=') + 'const CAT='.length;
  let d = 0, j = i;
  for (; j < html.length; j++) { const c = html[j]; if (c === '{') d++; else if (c === '}') { d--; if (!d) { j++; break; } } }
  return JSON.parse(html.slice(i, j)).laws || [];
}

const NAMED = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ordf: 'ª', ordm: 'º', deg: 'º', sect: '§', mdash: '—', ndash: '–', hellip: '…', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', bull: '•' };

export function limparHTML(buf) {
  // O Planalto NÃO é uniforme: a maioria das páginas vem em windows-1252, mas algumas
  // (Maria da Penha, por exemplo) vêm em UTF-16 com BOM. Decodificar tudo como 1252
  // devolvia texto com \u0000 entre as letras — e o parser não achava nenhum artigo.
  const b = new Uint8Array(buf);
  let enc = 'windows-1252';
  if (b[0] === 0xFF && b[1] === 0xFE) enc = 'utf-16le';
  else if (b[0] === 0xFE && b[1] === 0xFF) enc = 'utf-16be';
  else if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) enc = 'utf-8';
  let s = new TextDecoder(enc).decode(buf);
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
       .replace(/<\/(p|div|tr|h[1-6]|li|br)>/gi, '\n')
       .replace(/<br\s*\/?>/gi, '\n')
       .replace(/<[^>]+>/g, ' ')
       .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
       .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
       .replace(/&([a-z]+);/gi, (_, n) => NAMED[n] ?? NAMED[n.toLowerCase()] ?? ' ');
  return s.replace(/[ \t ]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
}

/** Quebra o texto corrido em artigos, preservando incisos e parágrafos de cada um. */
export function artigos(texto, teto = 4000) {
  const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
  const out = [];
  let atual = null;
  for (const l of linhas) {
    const m = /^(Art(?:igo)?\.?\s*\d+[\dºª°.\-A-Z]*)\s*[.\-–—]?\s*(.*)$/i.exec(l);
    if (m && m[1].length <= 26) {
      if (atual && atual.txt.length > 30) out.push(atual);
      atual = { rot: m[1].replace(/\.$/, '').replace(/\s+/g, ' '), txt: m[2] ? m[1] + ' ' + m[2] : m[1] };
    } else if (atual) {
      if (atual.txt.length < teto) atual.txt += '\n' + l;
    }
  }
  if (atual && atual.txt.length > 30) out.push(atual);
  // descarta índice/sumário: artigo cujo corpo é só o rótulo
  return out.filter((a) => a.txt.length > a.rot.length + 40);
}

/** Segundo parser, para páginas em que o rótulo e o corpo caem em linhas/células
 *  diferentes (a Lei 14.133 é assim: só 32 das 194 linhas começam com "Art."). Aqui o
 *  texto é tratado como corrido e cortado nas ocorrências de "Art. N" que iniciam frase. */
export function artigosCorrido(texto, teto = 4000) {
  const t = texto.replace(/\n+/g, ' ').replace(/\s+/g, ' ');
  const re = /(?:^|[.;:!?]\s+|\s{2,})(Art(?:igo)?\.?\s*\d+[ºª°]?(?:-[A-Z])?)\s*[.\-–—]?\s+(?=[A-ZÀ-Ú§])/g;
  const cortes = [];
  let m;
  while ((m = re.exec(t))) cortes.push({ i: m.index + m[0].indexOf(m[1]), rot: m[1].replace(/\.$/, '').replace(/\s+/g, ' ') });
  const out = [];
  for (let k = 0; k < cortes.length; k++) {
    const ini = cortes[k].i, fim = k + 1 < cortes.length ? cortes[k + 1].i : t.length;
    const txt = t.slice(ini, Math.min(fim, ini + teto)).trim();
    if (txt.length > cortes[k].rot.length + 40) out.push({ rot: cortes[k].rot, txt });
  }
  // dedup por rótulo, ficando com a ocorrência mais longa (a do corpo, não a da remissão)
  const melhor = new Map();
  for (const a of out) {
    const k = a.rot.toLowerCase().replace(/\s+/g, '');
    if (!melhor.has(k) || melhor.get(k).txt.length < a.txt.length) melhor.set(k, a);
  }
  return [...melhor.values()];
}

/** Escolhe entre os dois parsers — critério único, usado pelo build da lei seca e pelo sentinela.
 *  `teto` (caracteres por trecho): 4.000 no bundle (padrão, o que o build usa); o sentinela lê a
 *  página também sem teto, para comparar artigo por artigo (scripts/sentinela.mjs, 8). */
export function melhorParse(texto, { teto = 4000 } = {}) {
  let arts = artigos(texto, teto);
  const alt = artigosCorrido(texto, teto);
  // fica com o parser que achou mais artigos: nenhuma lei da lista tem menos de 30
  if (alt.length > arts.length * 1.3) arts = alt;
  return arts;
}

/** Baixa a página da lei e devolve os artigos. Lança em HTTP != 200 ou parse suspeito.
 *  O piso de artigos é a trava contra "a fonte mudou de forma e não dá mais para ler":
 *  melhor falhar alto do que devolver 3 artigos e o sentinela declarar 1.200 revogações.
 *  `prazo` (epoch ms, opcional) é o teto absoluto da leitura — ver buscarFonte. */
export async function baixarLei(url, { minArtigos = 20, timeoutMs = 40000, prazo = 0 } = {}) {
  const r = await buscarFonte(url, { timeoutMs, prazo });
  if (r.status !== 200) throw new Error('HTTP ' + r.status);
  const texto = limparHTML(r.buffer);
  const arts = melhorParse(texto);
  if (arts.length < minArtigos) throw new Error('só ' + arts.length + ' artigos — parse suspeito');
  // A mesma leitura sem o teto do bundle, com os MESMOS cortes (o teto só encurta o trecho):
  // o sentinela compara por ela o que o acervo não pôde guardar. Não enumerável — quem só
  // percorre os artigos (o build da lei seca) não vê diferença.
  const semTeto = melhorParse(texto, { teto: Infinity });
  if (semTeto.length === arts.length) Object.defineProperty(arts, 'semTeto', { value: semTeto, enumerable: false });
  return arts;
}
