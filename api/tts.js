// api/tts.js — narração em voz do Google (Gemini TTS), rodando na Vercel.
//
// Por que existe: o Multiformato gerava um "roteiro de narração" que era só texto na
// tela, sem botão de tocar. Esta função transforma esse roteiro em áudio de verdade.
//
// Usa a Interactions API (/v1beta/interactions) — o generateContent NÃO gera áudio.
// A resposta vem em PCM cru (1 canal, 24 kHz, 16 bits); navegador nenhum toca isso
// direto num <audio>, então embrulhamos num cabeçalho WAV aqui e devolvemos pronto.
//
// A chave fica só no servidor (GEMINI_API_KEY). Exige sessão do Supabase, igual ao
// /api/complete: TTS custa por caractere e não pode ficar aberto para a internet.

const SB_URL = (process.env.SUPABASE_URL || 'https://frcnfqxniwzdyykvgqqu.supabase.co').replace(/\/+$/, '');
const SB_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_nCm4a-RzzY8e8jVC9O6Gfg_4V6EOrI2';

// Teto de caracteres: a narração do Multiformato tem ~120-160 palavras (bem menos que
// isto). O limite existe para uma chamada só não virar uma conta cara.
const MAX_CHARS = 5000;

async function usuarioDoToken(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(h));
  if (!m) return null;
  try {
    const r = await fetch(SB_URL + '/auth/v1/user', {
      headers: { apikey: SB_KEY, authorization: 'Bearer ' + m[1] },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch (_) {
    return null;
  }
}

function liberado(user) {
  const lista = (process.env.BETA_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!lista.length) return true;
  return lista.includes(String(user.email || '').toLowerCase());
}

/** Embrulha PCM 16-bit mono num WAV — 44 bytes de cabeçalho, sem dependência nenhuma. */
function pcmParaWav(pcm, taxa, canais, bits) {
  const blocoAlinhamento = (canais * bits) / 8;
  const bytesPorSegundo = taxa * blocoAlinhamento;
  const cab = Buffer.alloc(44);
  cab.write('RIFF', 0);
  cab.writeUInt32LE(36 + pcm.length, 4);
  cab.write('WAVE', 8);
  cab.write('fmt ', 12);
  cab.writeUInt32LE(16, 16);          // tamanho do bloco fmt
  cab.writeUInt16LE(1, 20);           // 1 = PCM sem compressão
  cab.writeUInt16LE(canais, 22);
  cab.writeUInt32LE(taxa, 24);
  cab.writeUInt32LE(bytesPorSegundo, 28);
  cab.writeUInt16LE(blocoAlinhamento, 32);
  cab.writeUInt16LE(bits, 34);
  cab.write('data', 36);
  cab.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([cab, pcm]);
}

/** "audio/L16;codec=pcm;rate=24000" → {taxa, bits, canais}, com os padrões do Gemini. */
function formatoDoMime(mime) {
  const s = String(mime || '');
  const taxa = Number((/rate=(\d+)/.exec(s) || [])[1]) || 24000;
  const bits = Number((/L(\d+)/.exec(s) || [])[1]) || 16;
  const canais = Number((/channels=(\d+)/.exec(s) || [])[1]) || 1;
  return { taxa, bits, canais };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido — use POST.' });
    return;
  }

  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key) {
    res.status(503).json({ error: 'A narração em áudio não está configurada neste servidor.' });
    return;
  }

  const user = await usuarioDoToken(req);
  if (!user) { res.status(401).json({ error: 'Entre na sua conta do Cátedra para gerar a narração.' }); return; }
  if (!liberado(user)) { res.status(403).json({ error: 'Esta conta ainda não está liberada para o beta.' }); return; }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const texto = String(body.texto || '').trim();
    if (!texto) { res.status(400).json({ error: 'Nada para narrar.' }); return; }
    if (texto.length > MAX_CHARS) {
      res.status(413).json({ error: 'Texto longo demais para narrar (máx. ' + MAX_CHARS + ' caracteres).' });
      return;
    }

    const model = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
    const voz = /^[A-Za-z]{3,20}$/.test(String(body.voz || '')) ? body.voz : (process.env.GEMINI_TTS_VOICE || 'Kore');

    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        model,
        // A instrução de estilo vai no próprio texto — é assim que o modelo TTS aceita direção.
        input: 'Narre em português do Brasil, com ritmo calmo e didático de quem explica ' +
               'matéria de concurso:\n\n' + texto,
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice: voz }] },
      }),
    });

    if (!r.ok) {
      const detalhe = await r.text();
      // 429 é cota estourada — a mensagem precisa dizer isso, não "falhou".
      const amigavel = r.status === 429
        ? 'A cota de IA do dia acabou. Tente de novo mais tarde.'
        : 'Não deu para gerar a narração agora (' + r.status + ').';
      res.status(r.status).json({ error: amigavel, detail: detalhe.slice(0, 400) });
      return;
    }

    const data = await r.json();
    const saida = (data && (data.output_audio || (data.interaction && data.interaction.output_audio))) || null;
    const b64 = saida && saida.data;
    if (!b64) {
      res.status(502).json({ error: 'A IA não devolveu áudio.', detail: JSON.stringify(data).slice(0, 400) });
      return;
    }

    const { taxa, bits, canais } = formatoDoMime(saida.mime_type || saida.mimeType);
    const wav = pcmParaWav(Buffer.from(b64, 'base64'), taxa, canais, bits);
    res.status(200).json({ audio: wav.toString('base64'), mime: 'audio/wav', voz, segundos: Math.round(wav.length / (taxa * canais * bits / 8)) });
  } catch (e) {
    res.status(500).json({ error: 'Falha ao gerar a narração.', detail: String(e).slice(0, 300) });
  }
}
