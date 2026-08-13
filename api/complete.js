// api/complete.js — proxy seguro para a IA, rodando na Vercel.
//
// Provedores (em ordem de preferência, conforme a variável de ambiente presente):
//   1. Vercel AI Gateway  — AI_GATEWAY_API_KEY (chave vck_…). Um endpoint só,
//      compatível com OpenAI, roteando para qualquer modelo (Gemini, Claude, GPT…).
//      Modelo padrão: google/gemini-2.5-flash; troque com AI_MODEL
//      (ex.: anthropic/claude-haiku-4.5).
//   2. Google Gemini direto — GEMINI_API_KEY (plano gratuito do AI Studio).
//      Modelo padrão gemini-2.5-flash; troque com GEMINI_MODEL.
//
// Por que existe: o app (Catedra.dc.html) é 100% client-side e chama
// `window.claude.complete(prompt)`. Em produção o shim (ver scripts/build.mjs)
// faz POST para esta função; o app do Mac faz o mesmo via CatedraAIEndpoint.
// A CHAVE FICA SÓ AQUI, nas variáveis de ambiente da Vercel — nunca é enviada
// ao navegador do aluno (e o repositório é público: chave em arquivo, jamais).
//
// Sem dependências: usa o fetch nativo do runtime Node da Vercel.

// URL e chave PUBLISHABLE do Supabase (públicas por design — as mesmas do cliente).
const SB_URL = (process.env.SUPABASE_URL || 'https://frcnfqxniwzdyykvgqqu.supabase.co').replace(/\/+$/, '');
const SB_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_nCm4a-RzzY8e8jVC9O6Gfg_4V6EOrI2';

// Só quem tem sessão no Cátedra usa a IA. Antes esta função era um chatbot grátis e
// ilimitado faturado na conta da dona do app: sem login, sem origem, sem teto — e o
// endpoint está em texto puro no HTML, então bastava um scanner de /api/* achar o domínio.
// Validamos o access_token contra o próprio Supabase (não confiamos em assinatura local).
async function usuarioDoToken(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = /^Bearer\s+(.+)$/i.exec(String(h));
  if (!token) return null;
  try {
    const r = await fetch(SB_URL + '/auth/v1/user', {
      headers: { apikey: SB_KEY, authorization: 'Bearer ' + token[1] },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch (_) {
    return null;
  }
}

// Beta fechado: opcionalmente, só e-mails desta lista (variável de ambiente
// BETA_EMAILS, separados por vírgula). Vazia = qualquer conta autenticada entra.
function liberado(user) {
  const lista = (process.env.BETA_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!lista.length) return true;
  return lista.includes(String(user.email || '').toLowerCase());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido — use POST.' });
    return;
  }

  const user = await usuarioDoToken(req);
  if (!user) {
    res.status(401).json({ error: 'Entre na sua conta do Cátedra para usar a IA.' });
    return;
  }
  if (!liberado(user)) {
    res.status(403).json({ error: 'Esta conta ainda não está liberada para o beta.' });
    return;
  }

  const gwKey = (process.env.AI_GATEWAY_API_KEY || '').trim();
  const gemKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!gwKey && !gemKey) {
    res.status(500).json({ error: 'Nenhuma chave configurada — defina AI_GATEWAY_API_KEY (ou GEMINI_API_KEY) nas variáveis de ambiente da Vercel.' });
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
    // Teto de entrada: o maior prompt legítimo do app (raio-X de redação com o texto
    // inteiro) fica bem abaixo disso. Sem teto, uma chamada só podia custar caro.
    if (prompt.length > 60000) {
      res.status(413).json({ error: 'Texto grande demais para a IA (máx. 60 mil caracteres).' });
      return;
    }

    const maxTokens = Math.min(body.max_tokens || 4096, 8192);
    const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;

    // ---------- 1) Vercel AI Gateway (OpenAI-compatível) ----------
    // Se o Gateway recusar (ex.: 403 exigindo cartão na conta) e houver chave
    // Gemini, seguimos para o provedor 2 em vez de devolver erro ao aluno.
    if (gwKey) {
      const model = (typeof body.model === 'string' && /^[\w.\-]+\/[\w.\-]+$/.test(body.model))
        ? body.model
        : (process.env.AI_MODEL || 'google/gemini-2.5-flash');
      const r = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer ' + gwKey,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature,
        }),
      });
      if (!r.ok) {
        const detail = await r.text();
        if (!gemKey) {
          res.status(r.status).json({ error: 'Erro do AI Gateway (' + r.status + ')', detail: detail.slice(0, 500) });
          return;
        }
        // com chave Gemini disponível, cai para o provedor 2 (abaixo)
      } else {
        const data = await r.json();
        const text = (((data.choices || [])[0] || {}).message || {}).content || '';
        if (!text) {
          res.status(200).json({ completion: '', note: 'AI Gateway retornou vazio (' + ((((data.choices || [])[0] || {}).finish_reason) || 'sem texto') + ').' });
          return;
        }
        res.status(200).json({ completion: text });
        return;
      }
    }

    // ---------- 2) Gemini direto (fallback) ----------
    // modelo: aceita override do corpo (se for um nome de modelo Gemini) ou da env.
    const model = (typeof body.model === 'string' && /^gemini[\w.\-]*$/.test(body.model))
      ? body.model
      : (process.env.GEMINI_MODEL || 'gemini-2.5-flash');

    const genConfig = {
      maxOutputTokens: maxTokens,
      temperature,
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
          'x-goog-api-key': gemKey,
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
