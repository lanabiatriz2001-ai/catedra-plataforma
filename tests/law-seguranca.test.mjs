import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/law.js';

const URL_LEI = 'https://www.planalto.gov.br/ccivil_03/lei-teste.htm';
const HTML = '<html><head><title>Lei &amp; teste</title></head><body><p>Art. 1. Proteção e exceção.</p><p>Art. 2. Outro dispositivo.</p></body></html>';
const resposta = () => ({ code: 0, headers: {}, status(n) { this.code = n; return this; },
  setHeader(k, v) { this.headers[k] = v; }, json(body) { this.body = body; return this; } });

// Cada caso controla a rede; nenhum chama o Planalto. O prazo de 12 s vira 20 ms
// apenas neste processo de unidade. A leitura lenta sempre tem saída em 80 ms.
async function executar(fetchFalso, verificar, { prazoCurto = false } = {}) {
  const antesFetch = globalThis.fetch, antesTimer = globalThis.setTimeout;
  globalThis.fetch = fetchFalso;
  if (prazoCurto) globalThis.setTimeout = (fn, ms, ...args) => antesTimer(fn, ms === 12000 ? 20 : ms, ...args);
  try { await verificar(antesTimer); }
  finally { globalThis.fetch = antesFetch; globalThis.setTimeout = antesTimer; }
}
const ler = async (url = URL_LEI) => {
  const res = resposta(); await handler({ method: 'GET', query: { u: url } }, res); return res;
};

test('recusa URL externa e protocolo inseguro sem consultar a rede', async () => {
  await executar(async () => { assert.fail('URL recusada não pode iniciar fetch'); }, async () => {
    for (const url of ['https://example.invalid/lei', 'http://www.planalto.gov.br/lei', 'https://www.planalto.gov.br.example.invalid/lei']) {
      assert.equal((await ler(url)).code, 403);
    }
  });
});

test('preserva título, acentuação e artigos UTF-8', async () => {
  await executar(async () => new Response(HTML, { headers: { 'content-type': 'text/html;charset=utf-8' } }), async () => {
    const r = await ler(); assert.equal(r.code, 200);
    assert.equal(r.body.title, 'Lei & teste');
    assert.deepEqual(r.body.paragraphs, ['Art. 1. Proteção e exceção.', 'Art. 2. Outro dispositivo.']);
    assert.match(r.headers['Cache-Control'], /s-maxage=604800/);
  });
});

test('preserva texto legado UTF-16 com BOM', async () => {
  await executar(async () => new Response(Buffer.from('\ufeff' + HTML, 'utf16le')), async () => {
    const r = await ler(); assert.equal(r.code, 200);
    assert.equal(r.body.paragraphs[0], 'Art. 1. Proteção e exceção.');
  });
});

test('segue redirecionamento relativo permitido com o mesmo prazo', async () => {
  const chamadas = [];
  await executar(async (url, opcoes) => {
    chamadas.push({ url, ...opcoes });
    return chamadas.length === 1 ? new Response(null, { status: 302, headers: { location: '/lei-final.htm' } })
      : new Response(HTML, { headers: { 'content-type': 'text/html;charset=utf-8' } });
  }, async () => {
    const r = await ler(); assert.equal(r.code, 200);
    assert.equal(r.body.url, 'https://www.planalto.gov.br/lei-final.htm');
    assert.equal(chamadas.length, 2); assert.equal(chamadas[0].signal, chamadas[1].signal);
    assert.ok(chamadas.every(c => c.redirect === 'manual'));
  });
});

test('bloqueia redirecionamento externo antes da segunda consulta', async () => {
  let chamadas = 0;
  await executar(async () => { chamadas++; return new Response(null, { status: 302, headers: { location: 'https://example.invalid/privado' } }); }, async () => {
    assert.equal((await ler()).code, 403); assert.equal(chamadas, 1);
  });
});

test('segue redirecionamento permitido mesmo se o corpo descartado estiver interrompido', async () => {
  let chamadas = 0;
  await executar(async () => {
    chamadas++;
    return chamadas === 1 ? new Response(new ReadableStream({ start(c) { c.error(new Error('corpo interrompido')); } }),
      { status: 302, headers: { location: '/lei-final.htm' } }) : new Response(HTML);
  }, async () => { assert.equal((await ler()).code, 200); assert.equal(chamadas, 2); });
});

test('interrompe espera pelos cabeçalhos com erro de prazo identificável', async () => {
  const timer = globalThis.setTimeout;
  await executar(async (_url, { signal }) => new Promise((resolve, reject) => {
    const fim = timer(() => resolve(new Response(HTML)), 80);
    signal.addEventListener('abort', () => { clearTimeout(fim); reject(new DOMException('Prazo esgotado', 'AbortError')); }, { once: true });
  }), async () => { const r = await ler(); assert.equal(r.code, 504); assert.equal(r.body.ok, false); }, { prazoCurto: true });
});

test('interrompe corpo lento mesmo depois de receber os cabeçalhos', async () => {
  let abortou = false;
  const timer = globalThis.setTimeout;
  await executar(async (_url, { signal }) => new Response(new ReadableStream({ start(c) {
    const fim = timer(() => { if (!signal.aborted) { c.enqueue(new TextEncoder().encode(HTML)); c.close(); } }, 80);
    signal.addEventListener('abort', () => { abortou = true; clearTimeout(fim); c.error(new DOMException('Prazo esgotado', 'AbortError')); }, { once: true });
  } })), async () => {
    const r = await ler(); assert.equal(r.code, 504); assert.equal(abortou, true);
    assert.equal(r.body.ok, false); assert.equal(r.body.paragraphs, undefined);
  }, { prazoCurto: true });
});

test('interrompe resposta sem content-length antes de baixar o corpo inteiro', async () => {
  let lidos = 0, cancelou = false;
  await executar(async () => new Response(new ReadableStream({
    pull(c) { if (lidos < 32) { lidos++; c.enqueue(new Uint8Array(1024 * 1024)); } else c.close(); },
    cancel() { cancelou = true; }
  })), async () => {
    const r = await ler(); assert.equal(r.code, 502);
    assert.match(r.body.error, /grande demais/); assert.ok(lidos < 32); assert.equal(cancelou, true);
  });
});

test('cancela o corpo quando o cabeçalho já excede o limite', async () => {
  let lidos = 0, cancelou = false;
  await executar(async () => new Response(new ReadableStream({
    pull(c) { lidos++; c.enqueue(new Uint8Array(1024)); }, cancel() { cancelou = true; }
  }), { headers: { 'content-length': String(9 * 1024 * 1024) } }), async () => {
    assert.equal((await ler()).code, 502); assert.ok(lidos <= 1); assert.equal(cancelou, true);
  });
});

test('limita cadeia de redirecionamentos a cinco consultas', async () => {
  let chamadas = 0;
  await executar(async () => { chamadas++; return new Response(null, { status: 302, headers: { location: '/outra-lei.htm' } }); }, async () => {
    assert.equal((await ler()).code, 502); assert.equal(chamadas, 5);
  });
});

test('não devolve corpo parcial quando a conexão falha durante a leitura', async () => {
  await executar(async () => new Response(new ReadableStream({ start(c) {
    c.enqueue(new TextEncoder().encode('<p>Art. 1. Trecho incompleto')); c.error(new Error('rede interrompida'));
  } })), async () => {
    const r = await ler(); assert.equal(r.code, 500); assert.equal(r.body.ok, false);
    assert.equal(r.body.paragraphs, undefined); assert.equal(r.headers['Cache-Control'], undefined);
  });
});
