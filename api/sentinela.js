// api/sentinela.js — o botão "Buscar atualizações agora", rodando na Vercel.
//
// Por que existe: o Cátedra não fala com a rede em tempo de execução (roda off-line e em
// file:// no Mac e no iPad). Quem consulta as fontes oficiais é esta função — o mesmo
// motor da rotina diária (scripts/sentinela.mjs), só que sob demanda e SEM gravar nada.
//
// A divisão de trabalho, de propósito:
//   • rotina diária (GitHub Actions) → CONSULTA e PREPARA (abre PR de rascunho com novidades.js)
//   • este endpoint                  → CONSULTA e RESPONDE (não escreve no repositório)
// Assim o registro definitivo tem sempre revisão humana, e o botão nunca inventa acervo.
//
// O que a resposta garante: por fonte, `resultado` ∈ sem-novidade | novidades | parcial |
// falha, com `ultimaTentativa` e `ultimoSucesso` separados. "Nada novo" e "não consegui
// consultar" NUNCA saem com a mesma cara.
//
// Portões, na mesma ordem e com as mesmas mensagens de /api/complete e /api/tts: sessão do
// Supabase (sem ela o endpoint vira um robô aberto batendo no Planalto e no STF em nome de
// qualquer um), beta (BETA_EMAILS + meu_email_liberado) e conta bloqueada
// (meu_acesso_bloqueado — que também carrega o interruptor global do painel). NÃO registra
// em ai_uso: a cota diária da IA conta toda linha dali, e buscar atualização não é IA.
//
// CORS: o app do Mac abre em file:// (origem "null") e, ao contrário do iPad, não liga o
// acesso universal — o fetch com Authorization dispara um preflight OPTIONS e, sem estes
// cabeçalhos, o botão morreria no navegador antes de chegar aqui. `*` é seguro porque a
// credencial é o Bearer explícito (nada de cookie): página de fora não tem o token, e sem
// ele recebe 401. Os cabeçalhos vão em TODA resposta, inclusive 401/403/400/405 — sem eles
// o app leria "falha de rede" em vez da frase pronta do erro.
import { rodar, COBERTURA, coberturaDe, estadoAnterior } from '../scripts/sentinela.mjs';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '600');
}

const SB_URL = (process.env.SUPABASE_URL || 'https://frcnfqxniwzdyykvgqqu.supabase.co').replace(/\/+$/, '');
const SB_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_nCm4a-RzzY8e8jVC9O6Gfg_4V6EOrI2';

// Respeito à fonte: uma varredura do Planalto são ~28 leituras. Dentro da janela, apertar
// o botão de novo devolve o resultado guardado, marcado como tal — em vez de martelar os
// servidores oficiais. `emCurso` junta pedidos simultâneos numa consulta só (dois cliques,
// duas pessoas ao mesmo tempo). O cache é da instância: ajuda, não garante.
const JANELA_MS = 10 * 60 * 1000;
const cache = new Map();    // fonte → { em, dado }
const emCurso = new Map();  // chave das fontes → Promise do rodar()

// Teto de tempo. A função morre aos 60 s (vercel.json) e a Vercel devolve 504 SEM corpo e sem
// os cabeçalhos de CORS: a tela leria "falha de rede" e perderia o erro por norma. O motor
// recebe um prazo ABSOLUTO com folga para responder (leitura em curso é cortada no prazo,
// leitura nova não começa sem folga) e o que não coube volta como parcial/falha, por extenso.
// A rede de segurança (PRAZO_MS + 8 s) responde mesmo se algo escapar do prazo do motor.
const PRAZO_MS = 45 * 1000;
const REDE_MS = PRAZO_MS + 8 * 1000;
// Teto de cada portão no Supabase (sessão e as duas RPCs). Sem ele, um Supabase lento comia o
// prazo da varredura — o prazo conta desde antes dos portões — e, parado de vez, levava a
// função aos 60 s: 504 sem corpo, exatamente o que o PRAZO_MS existe para evitar.
export const PORTAO_MS = 4000;
const tempoEsgotado = (e) => !!e && (e.name === 'TimeoutError' || e.name === 'AbortError');

/** O usuário da sessão, `null` sem sessão válida, ou 'tempo' quando o Supabase não respondeu
 *  dentro do teto — "entre na sua conta" seria a resposta errada para quem está logado. */
async function usuarioDoToken(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(h));
  if (!m) return null;
  try {
    const r = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SB_KEY, authorization: 'Bearer ' + m[1] }, signal: AbortSignal.timeout(PORTAO_MS) });
    if (!r.ok) return null;
    const u = await r.json();
    if (u && u.id) { u.__token = m[1]; return u; }
    return null;
  } catch (e) { return tempoEsgotado(e) ? 'tempo' : null; }
}

function liberado(user) {
  const lista = (process.env.BETA_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!lista.length) return true;
  return lista.includes(String(user.email || '').toLowerCase());
}

// As duas RPCs abaixo seguem o fail-open de api/complete.js para ERRO do Supabase: o portão
// que importa (sessão) já passou, e o Supabase piscar não pode derrubar o botão de todo mundo.
// Estouro do teto NÃO é erro: devolve 'tempo' e o handler responde 503. Liberar por demora
// deixaria passar conta bloqueada (e o interruptor global) só porque o Supabase ficou lento.
async function rpc(user, nome, seErro) {
  try {
    const r = await fetch(SB_URL + '/rest/v1/rpc/' + nome, {
      method: 'POST',
      headers: { apikey: SB_KEY, authorization: 'Bearer ' + user.__token, 'content-type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(PORTAO_MS),
    });
    if (!r.ok) return seErro;
    return await r.json();
  } catch (e) { return tempoEsgotado(e) ? 'tempo' : seErro; }
}

export default async function handler(req, res) {
  const inicio = Date.now();   // antes dos portões: o tempo do Supabase também conta
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') {
    res.setHeader('allow', 'GET, OPTIONS');
    res.status(405).json({ ok: false, error: 'Método não permitido — use GET.' });
    return;
  }
  const user = await usuarioDoToken(req);
  // Sem ponto final: a tela acrescenta o dela ao montar "Não foi possível consultar agora: …".
  const semTempo = () => res.status(503).json({ ok: false, error: 'O servidor de contas não respondeu a tempo para conferir o seu acesso. Tente de novo em instantes' });
  if (user === 'tempo') { semTempo(); return; }
  if (!user) { res.status(401).json({ ok: false, error: 'Entre na sua conta do Cátedra para buscar atualizações.' }); return; }
  if (!liberado(user)) { res.status(403).json({ ok: false, error: 'Esta conta ainda não está liberada para o beta.' }); return; }
  const emailLiberado = await rpc(user, 'meu_email_liberado', true);
  if (emailLiberado === 'tempo') { semTempo(); return; }
  if (emailLiberado === false) {
    res.status(403).json({ ok: false, error: 'Esta conta ainda não está liberada para o beta.' });
    return;
  }
  const bloqueado = await rpc(user, 'meu_acesso_bloqueado', false);
  if (bloqueado === 'tempo') { semTempo(); return; }
  if (bloqueado === true) {
    res.status(403).json({ ok: false, error: 'A busca de atualizações desta conta está pausada. Fale com quem te convidou.' });
    return;
  }

  const pedido = String((req.query && req.query.fonte) || 'planalto,stf,stj');
  const fontes = [...new Set(pedido.split(',').map((s) => s.trim()).filter((f) => COBERTURA[f]))];
  if (!fontes.length) { res.status(400).json({ ok: false, error: 'Fonte desconhecida. Use planalto, stf ou stj.' }); return; }

  const agora = Date.now();
  const doCache = fontes.filter((f) => cache.has(f) && agora - cache.get(f).em < JANELA_MS);
  const aConsultar = fontes.filter((f) => !doCache.includes(f));

  const estado = {};
  const itens = [];
  let novos = 0;
  for (const f of doCache) {
    const c = cache.get(f);
    estado[f] = { ...c.dado.estado, doCache: true, consultadoHa: Math.round((agora - c.em) / 1000) };
    itens.push(...c.dado.itens);
    novos += c.dado.novos;
  }

  if (aConsultar.length) {
    // O diário anterior de cada fonte: o do pacote implantado (novidades.js) e, se ESTA
    // instância já consultou com sucesso depois dele, o carimbo do cache — vale o mais recente.
    // Sem isto, uma falha passada a janela de 10 min devolvia ultimoSucesso nulo e a tela, que
    // grava o estado que recebe, apagava o "último sucesso" que já mostrava.
    let base = {};
    try { base = (estadoAnterior() || {}).fontes || {}; } catch (_) { base = {}; }
    const anterior = { fontes: { ...base } };
    for (const f of aConsultar) {
      const doCacheF = cache.get(f) && cache.get(f).dado.estado.ultimoSucesso;
      const doPacote = base[f] && base[f].ultimoSucesso;
      if (doCacheF && (!doPacote || doCacheF > doPacote)) anterior.fontes[f] = { ...(base[f] || {}), ultimoSucesso: doCacheF };
    }
    const chave = aConsultar.join(',');
    let p = emCurso.get(chave);
    if (!p) {
      p = rodar({ fontes: aConsultar, anterior, prazo: inicio + PRAZO_MS }).finally(() => emCurso.delete(chave));
      emCurso.set(chave, p);
    }
    let rede = null;
    try {
      const esgotou = new Promise((_, rejeita) => {
        rede = setTimeout(() => rejeita(new Error(`tempo esgotado: a consulta passou de ${Math.round(REDE_MS / 1000)} s e foi interrompida`)), Math.max(0, inicio + REDE_MS - Date.now()));
      });
      const r = await Promise.race([p, esgotou]);
      for (const f of aConsultar) {
        // Só o que ESTA consulta viu — não o acumulado do novidades.js do bundle, que o app
        // já tem. `novos` conta o que nem o bundle conhecia: é ele que vira o aviso na tela.
        const meus = r.achados.filter((i) => i.fonte === f);
        const meusNovos = r.novosItens.filter((i) => i.fonte === f).length;
        // Falha não entra no cache: apertar de novo tem de tentar de novo, não repetir o tombo.
        if (r.estado.fontes[f].resultado !== 'falha') cache.set(f, { em: agora, dado: { estado: r.estado.fontes[f], itens: meus, novos: meusNovos } });
        estado[f] = { ...r.estado.fontes[f], doCache: false };
        itens.push(...meus);
        novos += meusNovos;
      }
    } catch (e) {
      // Um tombo aqui é "não foi possível consultar", com o erro por extenso — nunca
      // "nenhuma novidade encontrada", e nunca 200 mudo. O último sucesso conhecido fica.
      for (const f of aConsultar) {
        const antes = anterior.fontes[f] || {};
        estado[f] = {
          ...coberturaDe(f),   // rótulo, o que monitora, limites e (Planalto) as normas
          resultado: 'falha', erro: String((e && e.message) || e),
          ultimaTentativa: new Date().toISOString(), ultimoSucesso: antes.ultimoSucesso || null,
          detalhe: '', novidadesNaConsulta: 0, doCache: false,
        };
      }
    } finally {
      if (rede) clearTimeout(rede);
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
      novidades: novos,
      encontradas: itens.length,
      exigemRevisao: itens.filter((i) => i.revisar).length,
      fontesOk: Object.entries(estado).filter(([, e]) => e.resultado !== 'falha').map(([f]) => f),
      fontesComFalha: Object.entries(estado).filter(([, e]) => e.resultado === 'falha').map(([f]) => f),
      fontesParciais: Object.entries(estado).filter(([, e]) => e.resultado === 'parcial').map(([f]) => f),
    },
  });
}
