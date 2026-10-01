// api/sentinela.js — o botão "Buscar atualizações agora", rodando na Vercel.
//
// Por que existe: o Cátedra não fala com a rede em tempo de execução (roda off-line e em
// file:// no Mac e no iPad). Quem consulta as fontes oficiais é esta função — o mesmo
// motor da rotina diária (scripts/sentinela.mjs), só que sob demanda e SEM gravar nada.
//
// A divisão de trabalho, de propósito:
//   • rotina diária (GitHub Actions) → CONSULTA e INCORPORA (abre PR com novidades.js)
//   • este endpoint                  → CONSULTA e RESPONDE (não escreve no repositório)
// Assim o registro definitivo tem sempre revisão humana, e o botão nunca inventa acervo.
//
// O que a resposta garante: por fonte, `resultado` ∈ sem-novidade | novidades | parcial |
// falha, com `ultimaTentativa` e `ultimoSucesso` separados. "Nada novo" e "não consegui
// consultar" NUNCA saem com a mesma cara.
//
// Exige sessão do Supabase, igual a /api/complete e /api/tts: sem isso o endpoint vira um
// robô aberto batendo no Planalto e no STF em nome de qualquer um.
import { rodar, COBERTURA } from '../scripts/sentinela.mjs';

const SB_URL = (process.env.SUPABASE_URL || 'https://frcnfqxniwzdyykvgqqu.supabase.co').replace(/\/+$/, '');
const SB_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_nCm4a-RzzY8e8jVC9O6Gfg_4V6EOrI2';

// Respeito à fonte: uma varredura do Planalto são ~28 leituras. Dentro da janela, apertar
// o botão de novo devolve o resultado guardado, marcado como tal — em vez de martelar os
// servidores oficiais. É também o que impede a rotina automática e o botão manual, rodando
// juntos, de dobrarem a carga (os ids são determinísticos, então nada duplica no acervo).
const JANELA_MS = 10 * 60 * 1000;
const cache = new Map();   // fonte → { em, dado }

async function usuarioDoToken(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(h));
  if (!m) return null;
  try {
    const r = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SB_KEY, authorization: 'Bearer ' + m[1] } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch (_) { return null; }
}

export default async function handler(req, res) {
  const user = await usuarioDoToken(req);
  if (!user) { res.status(401).json({ ok: false, error: 'Entre na sua conta do Cátedra para buscar atualizações.' }); return; }

  const pedido = String((req.query && req.query.fonte) || 'planalto,stf,stj');
  const fontes = pedido.split(',').map((s) => s.trim()).filter((f) => COBERTURA[f]);
  if (!fontes.length) { res.status(400).json({ ok: false, error: 'Fonte desconhecida. Use planalto, stf ou stj.' }); return; }

  const agora = Date.now();
  const doCache = fontes.filter((f) => cache.has(f) && agora - cache.get(f).em < JANELA_MS);
  const aConsultar = fontes.filter((f) => !doCache.includes(f));

  const estado = {};
  const itens = [];
  for (const f of doCache) {
    const c = cache.get(f);
    estado[f] = { ...c.dado.estado, doCache: true, consultadoHa: Math.round((agora - c.em) / 1000) };
    itens.push(...c.dado.itens);
  }

  if (aConsultar.length) {
    try {
      const r = await rodar({ fontes: aConsultar });
      for (const f of aConsultar) {
        const meus = r.itens.filter((i) => i.fonte === f);
        cache.set(f, { em: agora, dado: { estado: r.estado.fontes[f], itens: meus } });
        estado[f] = { ...r.estado.fontes[f], doCache: false };
        itens.push(...meus);
      }
    } catch (e) {
      // Um tombo aqui é "não foi possível consultar", com o erro por extenso — nunca
      // "nenhuma novidade encontrada", e nunca 200 mudo.
      for (const f of aConsultar) {
        estado[f] = {
          rotulo: COBERTURA[f].rotulo, resultado: 'falha', erro: String(e && e.message || e),
          ultimaTentativa: new Date().toISOString(), ultimoSucesso: null, detalhe: '', novidadesNaConsulta: 0,
        };
      }
    }
  }

  const houveFalha = Object.values(estado).some((e) => e.resultado === 'falha');
  res.setHeader('cache-control', 'no-store');
  res.status(200).json({
    ok: !houveFalha,
    geradoEm: new Date().toISOString(),
    cobertura: Object.fromEntries(fontes.map((f) => [f, COBERTURA[f]])),
    fontes: estado,
    itens,
    // Resumo que a tela mostra sem ter de recontar nada — e que separa as quatro coisas
    // que o pedido exige que nunca se confundam.
    resumo: {
      novidades: itens.length,
      exigemRevisao: itens.filter((i) => i.revisar).length,
      fontesOk: Object.entries(estado).filter(([, e]) => e.resultado !== 'falha').map(([f]) => f),
      fontesComFalha: Object.entries(estado).filter(([, e]) => e.resultado === 'falha').map(([f]) => f),
      fontesParciais: Object.entries(estado).filter(([, e]) => e.resultado === 'parcial').map(([f]) => f),
    },
  });
}
