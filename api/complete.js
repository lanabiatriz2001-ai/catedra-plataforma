// api/complete.js — proxy seguro para a IA, rodando na Vercel.
//
// Provedores (em ordem de preferência, conforme a variável de ambiente presente):
//   1. Anthropic (Claude) direto — ANTHROPIC_API_KEY (chave sk-ant-…). A melhor
//      qualidade para o raciocínio jurídico em português (raio-X de redação, dicas
//      de banca). Modelo padrão claude-sonnet-5; troque com ANTHROPIC_MODEL
//      nas variáveis do servidor.
//   2. Vercel AI Gateway  — AI_GATEWAY_API_KEY (chave vck_…). Um endpoint só,
//      compatível com OpenAI, roteando para qualquer modelo (Gemini, Claude, GPT…).
//      Modelo padrão: google/gemini-2.5-flash; troque com AI_MODEL.
//   3. Google Gemini direto — GEMINI_API_KEY (plano gratuito do AI Studio).
//      Modelo padrão gemini-2.5-flash; troque com GEMINI_MODEL. Essa chave também
//      move a narração (api/tts.js), que é só Gemini — por isso ela nunca sai.
//
// Por que existe: o app (Catedra.dc.html) é 100% client-side e chama
// `window.claude.complete(prompt)`. Em produção o shim (ver scripts/build.mjs)
// faz POST para esta função; o app do Mac faz o mesmo via CatedraAIEndpoint.
// A CHAVE FICA SÓ AQUI, nas variáveis de ambiente da Vercel — nunca é enviada
// ao navegador do aluno (e o repositório é público: chave em arquivo, jamais).
//
// Sem dependências: usa o fetch nativo do runtime Node da Vercel.

import { autorizarRecurso, cotaDoDia, mensagemCota, reservarUsoIA } from '../scripts/lib/acesso-api.mjs';
export { cotaDoDia, mensagemCota };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido — use POST.' });
    return;
  }

  const acesso = await autorizarRecurso(req,
    'Entre na sua conta do Cátedra para usar a IA.',
    'O acesso à IA desta conta foi pausado. Fale com quem te convidou.');
  if (acesso.erro) { res.status(acesso.codigo).json({ error: acesso.erro }); return; }
  const cota = await cotaDoDia(acesso.usuario);
  if (cota && cota.usadas >= cota.limite) {
    res.status(429).json({ error: mensagemCota(cota), cota });
    return;
  }

  const antKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  const gwKey = (process.env.AI_GATEWAY_API_KEY || '').trim();
  const gemKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!antKey && !gwKey && !gemKey) {
    res.status(500).json({ error: 'Nenhuma chave configurada — defina ANTHROPIC_API_KEY (ou AI_GATEWAY_API_KEY, ou GEMINI_API_KEY) nas variáveis de ambiente da Vercel.' });
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
    // Só o servidor escolhe os modelos cobrados da plataforma, inclusive na cascata.
    const modeloClaude = antKey && (process.env.ANTHROPIC_MODEL || 'claude-sonnet-5');
    const modeloGateway = gwKey && (process.env.AI_MODEL || 'google/gemini-2.5-flash');
    const modeloGemini = gemKey && (process.env.GEMINI_MODEL || 'gemini-2.5-flash');
    if (Object.hasOwn(body, 'model') && (typeof body.model !== 'string' || !body.model ||
        ![modeloClaude, modeloGateway, modeloGemini].includes(body.model))) {
      res.status(400).json({ error: 'Modelo de IA não disponível nesta plataforma.' });
      return;
    }

    const recusa = await reservarUsoIA(acesso.usuario, 'complete', prompt.length);
    if (recusa) { res.status(recusa.codigo).json(recusa.corpo); return; }

    const maxTokens = Math.min(body.max_tokens || 4096, 8192);
    const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;

    // ---------- 1) Anthropic (Claude) direto ----------
    // Provedor preferido: a melhor qualidade no raciocínio jurídico em português.
    // Se a Anthropic falhar e houver Gateway/Gemini, seguimos para o próximo em
    // vez de derrubar o aluno.
    if (antKey) {
      try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': antKey,
          'anthropic-version': '2023-06-01',
        },
        // Sem temperature: os modelos Claude atuais recusam sampling fora do padrão (400).
        // thinking desligado: o orçamento inteiro vai para a resposta visível, sem risco
        // de truncar (mesma intenção do thinkingBudget:0 do Gemini). Para um raio-X com
        // raciocínio mais profundo, é só religar o thinking e subir o max_tokens.
        body: JSON.stringify({
          model: modeloClaude,
          max_tokens: maxTokens,
          thinking: { type: 'disabled' },
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!r.ok) {
        const detail = await r.text();
        // Sem este log, uma chave errada/expirada fazia TUDO degradar para o Gemini em
        // silêncio: a qualidade caía e não havia rastro de por quê. Vai para os logs da Vercel.
        console.warn('[Catedra] Anthropic recusou (' + r.status + '): ' + detail.slice(0, 300));
        if (!gwKey && !gemKey) {
          res.status(r.status).json({ error: 'Erro da Anthropic (' + r.status + ')', detail: detail.slice(0, 500) });
          return;
        }
        // com Gateway/Gemini disponível, cai para o próximo provedor (abaixo)
      } else {
        const data = await r.json();
        const text = (Array.isArray(data.content) ? data.content : [])
          .filter((b) => b && b.type === 'text')
          .map((b) => b.text || '').join('');
        if (!text) {
          res.status(200).json({ completion: '', note: 'Claude retornou vazio (' + (data.stop_reason || 'sem texto') + ').' });
          return;
        }
        res.status(200).json({ completion: text });
        return;
      }
      } catch (e) {
        // A cascata só cobria erro HTTP. Um fetch que ESTOURA (DNS, timeout, TLS) ou um
        // JSON inválido escapava daqui direto para o catch geral lá embaixo, devolvendo
        // 500 — ou seja: o aluno ficava sem IA mesmo havendo Gateway/Gemini configurados.
        console.warn('[Catedra] Anthropic falhou: ' + String(e).slice(0, 300));
        if (!gwKey && !gemKey) {
          res.status(502).json({ error: 'Não consegui falar com a IA agora. Tente de novo.', detail: String(e).slice(0, 300) });
          return;
        }
        // com Gateway/Gemini disponível, segue para o próximo provedor
      }
    }

    // ---------- 2) Vercel AI Gateway (OpenAI-compatível) ----------
    // Se o Gateway recusar (ex.: 403 exigindo cartão na conta) e houver chave
    // Gemini, seguimos para o próximo provedor em vez de devolver erro ao aluno.
    if (gwKey) {
      try {
      const r = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer ' + gwKey,
        },
        body: JSON.stringify({
          model: modeloGateway,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature,
        }),
      });
      if (!r.ok) {
        const detail = await r.text();
        console.warn('[Catedra] AI Gateway recusou (' + r.status + '): ' + detail.slice(0, 300));
        if (!gemKey) {
          res.status(r.status).json({ error: 'Erro do AI Gateway (' + r.status + ')', detail: detail.slice(0, 500) });
          return;
        }
        // com chave Gemini disponível, cai para o provedor 3 (abaixo)
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
      } catch (e) {
        // Mesmo motivo do bloco anterior: exceção de rede não pode matar a cascata.
        console.warn('[Catedra] AI Gateway falhou: ' + String(e).slice(0, 300));
        if (!gemKey) {
          res.status(502).json({ error: 'Não consegui falar com a IA agora. Tente de novo.', detail: String(e).slice(0, 300) });
          return;
        }
        // com Gemini disponível, segue para o provedor 3
      }
    }

    // ---------- 3) Gemini direto (fallback) ----------
    const genConfig = {
      maxOutputTokens: maxTokens,
      temperature,
    };
    // modelos 2.5 têm "thinking" que consome tokens de saída; desligamos para
    // garantir que o orçamento vá para a resposta (e menos latência).
    if (/2\.5/.test(modeloGemini)) genConfig.thinkingConfig = { thinkingBudget: 0 };

    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + modeloGemini + ':generateContent',
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
