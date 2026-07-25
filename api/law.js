// api/law.js — proxy de leitura do Planalto, rodando na Vercel.
//
// Por que existe: o leitor de lei do CátedraLEGIS web precisa do TEXTO da lei
// dentro do app, mas o navegador não pode buscar o planalto.gov.br direto
// (CORS). Esta função busca no servidor (sem CORS), decodifica o charset
// legado do Planalto (windows-1252/ISO-8859-1) e devolve o texto já limpo em
// parágrafos, pronto pro leitor. NÃO roda no app nativo (file://) — lá o
// CátedraLEGIS tem o seu próprio leitor; a web usa este proxy no deploy.
//
// Segurança: só busca hosts do planalto.gov.br (evita virar proxy aberto/SSRF).
// Sem dependências: fetch nativo do runtime Node + TextDecoder('windows-1252').

const ALLOW = /^(www\.)?planalto\.gov\.br$/i;

// Entidades HTML mais comuns em páginas do Planalto (o resto vira literal após
// decodificar windows-1252). Cobre nomeadas usuais + numéricas decimal/hex.
const NAMED = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  agrave: 'à', acirc: 'â', ecirc: 'ê', ocirc: 'ô', atilde: 'ã', otilde: 'õ',
  ccedil: 'ç', ordf: 'ª', ordm: 'º', deg: 'º', sect: '§', mdash: '—', ndash: '–',
  hellip: '…', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', bull: '•',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  Atilde: 'Ã', Otilde: 'Õ', Ccedil: 'Ç', Acirc: 'Â', Ecirc: 'Ê', Ocirc: 'Ô'
};
function decodeEntities(s) {
  return s.replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCP(parseInt(h, 16)))
          .replace(/&#(\d+);/g, (_, d) => safeCP(parseInt(d, 10)))
          .replace(/&([a-z]+);/gi, (m, n) => (NAMED[n] != null ? NAMED[n] : m));
}
function safeCP(cp) { try { return String.fromCodePoint(cp); } catch (_) { return ''; } }

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1].replace(/\s+/g, ' ').trim()) : '';
}

// HTML → parágrafos limpos, sem DOM.
function toParagraphs(html) {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  // quebras de bloco viram \n
  s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n')
       .replace(/<\/\s*(p|div|tr|li|h[1-6]|table|blockquote)\s*>/gi, '\n')
       .replace(/<[^>]+>/g, ' ');            // remove o resto das tags
  s = decodeEntities(s).replace(/ /g, ' ');
  return s.split('\n')
    .map(l => l.replace(/[ \t\f\v]+/g, ' ').trim())
    .filter(l => l.length > 1)
    // descarta rodapé/navegação óbvios do Planalto
    .filter(l => !/^(Presid[êe]ncia da Rep[úu]blica|Casa Civil|Subchefia|Este texto n[ãa]o substitui|Imprimir|Voltar|Topo)\b/i.test(l));
}

export default async function handler(req, res) {
  try {
    const raw = (req.query && (req.query.u || req.query.url)) || '';
    if (!raw) { res.status(400).json({ ok: false, error: 'Falta o parâmetro ?u=<url do planalto>.' }); return; }
    let url;
    try { url = new URL(String(raw)); } catch (_) { res.status(400).json({ ok: false, error: 'URL inválida.' }); return; }
    if (url.protocol !== 'https:' || !ALLOW.test(url.hostname)) {
      res.status(403).json({ ok: false, error: 'Só é permitido ler de https://www.planalto.gov.br.' });
      return;
    }

    // Redirecionamentos são seguidos MANUALMENTE, revalidando o host a cada
    // salto — senão redirect:'follow' sairia da whitelist (SSRF via open-redirect).
    // Timeout de 12s evita pendurar a função.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const HEADERS = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9'
    };
    let target = url.href, r;
    try {
      for (let hop = 0; hop < 5; hop++) {
        r = await fetch(target, { headers: HEADERS, redirect: 'manual', signal: ctrl.signal });
        if (r.status >= 300 && r.status < 400) {
          const loc = r.headers.get('location');
          if (!loc) break;
          let next;
          try { next = new URL(loc, target); } catch (_) { res.status(502).json({ ok: false, error: 'Redirecionamento inválido.' }); return; }
          if (next.protocol !== 'https:' || !ALLOW.test(next.hostname)) {
            res.status(403).json({ ok: false, error: 'Redirecionamento para fora do planalto.gov.br bloqueado.' });
            return;
          }
          target = next.href; continue;
        }
        break;
      }
    } finally { clearTimeout(timer); }
    if (!r) { res.status(502).json({ ok: false, error: 'Sem resposta do Planalto.' }); return; }
    if (r.status >= 300 && r.status < 400) { res.status(502).json({ ok: false, error: 'Redirecionamentos demais.' }); return; }
    if (!r.ok) { res.status(502).json({ ok: false, error: 'Planalto respondeu ' + r.status + '.' }); return; }

    // Guarda de tamanho: recusa respostas absurdamente grandes (páginas de lei < 4 MB).
    const clen = parseInt(r.headers.get('content-length') || '0', 10);
    if (clen && clen > 8 * 1024 * 1024) { res.status(502).json({ ok: false, error: 'Página grande demais.' }); return; }

    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.byteLength > 12 * 1024 * 1024) { res.status(502).json({ ok: false, error: 'Página grande demais.' }); return; }
    // charset: meta tag > header > windows-1252 (padrão histórico do Planalto)
    const head = new TextDecoder('latin1').decode(buf.subarray(0, 2048));
    const ctype = (r.headers.get('content-type') || '') + ' ' + head;
    const isUtf8 = /charset\s*=\s*["']?\s*utf-?8/i.test(ctype);
    const html = new TextDecoder(isUtf8 ? 'utf-8' : 'windows-1252').decode(buf);

    const paragraphs = toParagraphs(html);
    if (!paragraphs.length) { res.status(502).json({ ok: false, error: 'Não consegui extrair o texto desta página.' }); return; }

    // lei muda raramente → deixa a Vercel cachear na borda por 7 dias.
    res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate=86400');
    res.status(200).json({ ok: true, title: extractTitle(html), url: target, paragraphs });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Falha ao buscar a lei: ' + (e && e.message ? e.message : String(e)) });
  }
}
