import assert from 'node:assert/strict';
import test from 'node:test';
import complete from '../api/complete.js';
import tts from '../api/tts.js';
import sentinela from '../api/sentinela.js';

const casos = [
  { nome: 'texto', handler: complete, metodo: 'POST', statusPermitido: 200 },
  { nome: 'voz', handler: tts, metodo: 'POST', statusPermitido: 200 },
  // Fonte fictícia: passar pela autorização chega à validação de fonte (400), sem consultar a rede.
  { nome: 'Sentinela', handler: sentinela, metodo: 'GET', statusPermitido: 400 },
];
const modelos = [
  { chave: 'ANTHROPIC_API_KEY', variavel: 'ANTHROPIC_MODEL', modelo: 'claude-modelo-teste', provedor: 'api.anthropic.com' },
  { chave: 'AI_GATEWAY_API_KEY', variavel: 'AI_MODEL', modelo: 'teste/modelo-da-conta', provedor: 'ai-gateway.vercel.sh' },
  { chave: 'GEMINI_API_KEY', variavel: 'GEMINI_MODEL', modelo: 'gemini-modelo-teste', provedor: 'generativelanguage.googleapis.com' },
];
const json = (valor) => new Response(JSON.stringify(valor), { status: 200 });

function ambiente(t) {
  for (const nome of ['BETA_EMAILS', ...modelos.flatMap(m => [m.chave, m.variavel])]) {
    const antes = process.env[nome];
    delete process.env[nome];
    t.after(() => {
      if (antes === undefined) delete process.env[nome];
      else process.env[nome] = antes;
    });
  }
}

function simular(t, respostas = {}) {
  const chamadas = [];
  t.mock.method(globalThis, 'fetch', async (destino, opcoes) => {
    const url = new URL(destino);
    const rota = url.pathname.split('/').pop();
    chamadas.push({ url, corpo: opcoes.body ? JSON.parse(opcoes.body) : null });
    if (Object.hasOwn(respostas, rota)) return respostas[rota]();
    switch (rota) {
      case 'user': return json({ id: 'conta-de-teste', email: 'teste@example.invalid' });
      case 'meu_email_liberado': return json(true);
      case 'meu_acesso_bloqueado': return json(false);
      case 'minha_cota_ia': return json({ plano: 'beta', usadas: 0, limite: 4 });
      case 'reservar_uso_ia': return json({ plano: 'beta', usadas: 1, limite: 4, reservada: true });
      case 'messages': return json({ content: [{ type: 'text', text: 'resposta' }] });
      case 'completions': return json({ choices: [{ message: { content: 'resposta' } }] });
      case 'interactions': return json({ output_audio: { data: 'AAAA' } });
    }
    if (url.hostname === modelos[2].provedor && rota.endsWith(':generateContent')) {
      return json({ candidates: [{ content: { parts: [{ text: 'resposta' }] } }] });
    }
    throw new Error('Destino inesperado no teste');
  });
  return chamadas;
}

async function chamar(caso, opcoes = {}) {
  const res = {
    codigo: 0, setHeader() {}, status(codigo) { this.codigo = codigo; return this; },
    json(corpo) { this.corpo = corpo; },
  };
  await caso.handler({
    method: caso.metodo, headers: { authorization: 'Bearer sessao-ficticia' },
    body: { prompt: 'teste', texto: 'teste', ...opcoes }, query: { fonte: 'fonte-ficticia' },
  }, res);
  return res;
}

const reservou = chamadas => chamadas.some(({ url }) => url.pathname.endsWith('/reservar_uso_ia'));
const chamouProvedor = chamadas => chamadas.some(({ url }) => modelos.some(m => url.hostname === m.provedor));

for (const caso of casos) {
  for (const portao of ['meu_email_liberado', 'meu_acesso_bloqueado']) {
    for (const [tipo, resposta] of Object.entries({
      'HTTP 500': () => new Response(null, { status: 500 }),
      'rede indisponível': () => { throw new Error('rede'); },
      'JSON ilegível': () => new Response('{'),
      'booleano ausente': () => json(null),
      'tipo incorreto': () => json({ permitido: true }),
      'texto no lugar de booleano': () => json('false'),
    })) {
      test(caso.nome + ' responde 503 se ' + portao + ' devolver ' + tipo, async t => {
        ambiente(t);
        process.env.GEMINI_API_KEY = 'teste';
        const chamadas = simular(t, { [portao]: resposta });
        const res = await chamar(caso);
        assert.equal(res.codigo, 503);
        assert.ok(res.corpo.error);
        assert.equal(reservou(chamadas), false);
        assert.equal(chamouProvedor(chamadas), false);
      });
    }
    test(caso.nome + ' respeita recusa expressa em ' + portao, async t => {
      ambiente(t);
      process.env.GEMINI_API_KEY = 'teste';
      const chamadas = simular(t, { [portao]: () => json(portao === 'meu_acesso_bloqueado') });
      const res = await chamar(caso);
      assert.equal(res.codigo, 403);
      assert.equal(reservou(chamadas), false);
      assert.equal(chamouProvedor(chamadas), false);
    });
  }
  test(caso.nome + ' prossegue quando o beta permite e não há bloqueio', async t => {
    ambiente(t);
    process.env.GEMINI_API_KEY = 'teste';
    const chamadas = simular(t);
    const res = await chamar(caso);
    assert.equal(res.codigo, caso.statusPermitido);
    assert.equal(chamouProvedor(chamadas), caso.metodo === 'POST');
  });
  if (caso.metodo === 'POST') {
    test(caso.nome + ' respeita revogação detectada ao reservar a cota', async t => {
      ambiente(t);
      process.env.GEMINI_API_KEY = 'teste';
      const chamadas = simular(t, { reservar_uso_ia: () => json({ acesso_negado: true, reservada: false }) });
      assert.equal((await chamar(caso)).codigo, 403);
      assert.equal(reservou(chamadas), true);
      assert.equal(chamouProvedor(chamadas), false);
    });
  }
}

for (const m of modelos) {
  test('O servidor decide o modelo de ' + m.provedor + ' antes da reserva', async t => {
    ambiente(t);
    process.env[m.chave] = 'teste';
    process.env[m.variavel] = m.modelo;
    const chamadas = simular(t);
    for (const model of ['claude-nao-autorizado', 'teste/nao-autorizado', 'gemini-nao-autorizado', null, {}, '']) {
      const recusada = await chamar(casos[0], { model });
      assert.equal(recusada.codigo, 400);
      assert.equal(reservou(chamadas), false);
      assert.equal(chamouProvedor(chamadas), false);
    }
    for (const opcoes of [{}, { model: m.modelo }]) {
      chamadas.length = 0;
      const aceita = await chamar(casos[0], opcoes);
      assert.equal(aceita.codigo, 200);
      assert.equal(aceita.corpo.completion, 'resposta');
      assert.equal(reservou(chamadas), true);
      const envio = chamadas.find(({ url }) => url.hostname === m.provedor);
      assert.ok(envio);
      if (m === modelos[2]) assert.ok(envio.url.pathname.endsWith('/' + m.modelo + ':generateContent'));
      else assert.equal(envio.corpo.model, m.modelo);
    }
  });
}

test('A cascata de texto usa o modelo de cada provedor com uma única reserva', async t => {
  ambiente(t);
  for (const m of modelos) {
    process.env[m.chave] = 'teste';
    process.env[m.variavel] = m.modelo;
  }
  const chamadas = simular(t, {
    messages: () => new Response(null, { status: 503 }),
    completions: () => new Response(null, { status: 503 }),
  });
  const res = await chamar(casos[0], { model: modelos[0].modelo });
  assert.equal(res.codigo, 200);
  assert.equal(chamadas.filter(({ url }) => url.pathname.endsWith('/reservar_uso_ia')).length, 1);
  const envios = chamadas.filter(({ url }) => modelos.some(m => url.hostname === m.provedor));
  assert.deepEqual(envios.map(({ url }) => url.hostname), modelos.map(m => m.provedor));
  assert.equal(envios[0].corpo.model, modelos[0].modelo);
  assert.equal(envios[1].corpo.model, modelos[1].modelo);
  assert.ok(envios[2].url.pathname.endsWith('/' + modelos[2].modelo + ':generateContent'));
});

test('Um modelo de provedor desativado fica fora da lista da plataforma', async t => {
  ambiente(t);
  process.env.AI_GATEWAY_API_KEY = 'teste';
  process.env.GEMINI_MODEL = 'gemini-configurado-sem-chave';
  const chamadas = simular(t);
  assert.equal((await chamar(casos[0], { model: process.env.GEMINI_MODEL })).codigo, 400);
  assert.equal(reservou(chamadas), false);
  assert.equal(chamouProvedor(chamadas), false);
});

for (const [status, esperado] of [[401, 401], [403, 401], [404, 503], [429, 503], [502, 503]]) {
  test('A consulta de sessão com HTTP ' + status + ' interrompe o pedido com ' + esperado, async t => {
    ambiente(t);
    process.env.GEMINI_API_KEY = 'teste';
    const chamadas = simular(t, { user: () => new Response(null, { status }) });
    assert.equal((await chamar(casos[0])).codigo, esperado);
    assert.equal(chamadas.length, 1);
  });
}
