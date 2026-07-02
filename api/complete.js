// api/complete.js — proxy seguro para a API da Anthropic (Claude), rodando na Vercel.
//
// Por que existe: o app (Catedra.dc.html) é 100% client-side e chama
// `window.claude.complete(prompt)`. Em produção esse objeto não existe, então
// definimos um shim (ver scripts/build.mjs) que faz POST para esta função.
// A CHAVE DA API FICA SÓ AQUI, na variável de ambiente ANTHROPIC_API_KEY da
// Vercel — nunca é enviada ao navegador do aluno.
//
// Sem dependências: usa o fetch nativo do runtime Node da Vercel e a REST API
// oficial da Anthropic (/v1/messages).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido — use POST.' });
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada nas variáveis de ambiente da Vercel.' });
    return;
  }

  try {
    // O corpo pode chegar já parseado (objeto) ou como string, dependendo do runtime.
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const prompt = (body.prompt || '').toString();
    if (!prompt.trim()) {
      res.status(400).json({ error: 'prompt vazio.' });
      return;
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: body.model || 'claude-opus-4-8',
        max_tokens: Math.min(body.max_tokens || 4096, 8192),
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      res.status(r.status).json({ error: 'Erro da Anthropic (' + r.status + ')', detail: detail.slice(0, 500) });
      return;
    }

    const data = await r.json();
    const text = Array.isArray(data.content)
      ? data.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
      : '';

    res.status(200).json({ completion: text });
  } catch (e) {
    res.status(500).json({ error: 'Falha ao chamar a IA.', detail: String(e).slice(0, 300) });
  }
}
