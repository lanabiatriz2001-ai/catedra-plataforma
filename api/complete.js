// api/complete.js — proxy seguro para a IA, rodando na Vercel.
//
// Provedor: Google Gemini (plano GRATUITO do Google AI Studio).
// Por que existe: o app (Catedra.dc.html) é 100% client-side e chama
// `window.claude.complete(prompt)`. Em produção o shim (ver scripts/build.mjs)
// faz POST para esta função. A CHAVE FICA SÓ AQUI, na variável de ambiente
// GEMINI_API_KEY da Vercel — nunca é enviada ao navegador do aluno.
//
// Modelo padrão: gemini-2.0-flash (grátis e estável). Para trocar, defina a
// variável de ambiente GEMINI_MODEL (ex.: gemini-2.5-flash).
//
// Sem dependências: usa o fetch nativo do runtime Node da Vercel e a REST API
// do Gemini (generativelanguage.googleapis.com).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido — use POST.' });
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'GEMINI_API_KEY não configurada nas variáveis de ambiente da Vercel.' });
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

    // modelo: aceita override do corpo (se for um nome de modelo Gemini) ou da env.
    const model = (typeof body.model === 'string' && /^gemini[\w.\-]*$/.test(body.model))
      ? body.model
      : (process.env.GEMINI_MODEL || 'gemini-2.5-flash');

    const genConfig = {
      maxOutputTokens: Math.min(body.max_tokens || 4096, 8192),
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
    };
    // modelos 2.5 têm "thinking" que consome tokens de saída; desligamos para
    // garantir que o orçamento vá para a resposta (e menos latência).
    if (/2\.5/.test(model)) genConfig.thinkingConfig = { thinkingBudget: 0 };

    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: genConfig,
        }),
      }
    );

    if (!r.ok) {
      const detail = await r.text();
      res.status(r.status).json({ error: 'Erro do Gemini (' + r.status + ')', detail: detail.slice(0, 500) });
      return;
    }

    const data = await r.json();
    const cand = Array.isArray(data.candidates) ? data.candidates[0] : null;
    const parts = cand && cand.content && Array.isArray(cand.content.parts) ? cand.content.parts : [];
    const text = parts.map((p) => p.text || '').join('');

    if (!text) {
      // resposta vazia costuma ser bloqueio por filtro de segurança do Gemini.
      const reason = (cand && cand.finishReason) || (data.promptFeedback && data.promptFeedback.blockReason) || 'sem texto';
      res.status(200).json({ completion: '', note: 'Gemini retornou vazio (' + reason + ').' });
      return;
    }

    res.status(200).json({ completion: text });
  } catch (e) {
    res.status(500).json({ error: 'Falha ao chamar a IA.', detail: String(e).slice(0, 300) });
  }
}
