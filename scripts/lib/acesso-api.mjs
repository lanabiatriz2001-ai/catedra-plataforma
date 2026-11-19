// Autorização das funções da Vercel com o token da própria pessoa.
const SB_URL = (process.env.SUPABASE_URL || 'https://frcnfqxniwzdyykvgqqu.supabase.co').replace(/\/+$/, '');
const SB_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_nCm4a-RzzY8e8jVC9O6Gfg_4V6EOrI2';
export const PORTAO_MS = 4000;

async function consultar(token, nome, corpo = {}) {
  const resposta = await fetch(SB_URL + '/rest/v1/rpc/' + nome, {
    method: 'POST',
    headers: { apikey: SB_KEY, authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(PORTAO_MS),
  });
  if (!resposta.ok) throw new Error('Consulta indisponível');
  return resposta.json();
}

async function conferirPermissao(token, nome) {
  const valor = await consultar(token, nome);
  if (typeof valor !== 'boolean') throw new Error('Permissão inválida');
  return valor;
}

export async function autorizarRecurso(req, semSessao, bloqueio) {
  const cabecalho = req.headers.authorization || req.headers.Authorization || '';
  const credencial = /^Bearer\s+(.+)$/i.exec(cabecalho);
  if (!credencial) return { codigo: 401, erro: semSessao };
  const token = credencial[1];
  try {
    const resposta = await fetch(SB_URL + '/auth/v1/user', {
      headers: { apikey: SB_KEY, authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(PORTAO_MS),
    });
    if (!resposta.ok) {
      if ([400, 401, 403].includes(resposta.status)) return { codigo: 401, erro: semSessao };
      throw new Error('Sessão indisponível');
    }
    const pessoa = await resposta.json();
    if (!pessoa || typeof pessoa.id !== 'string' || !pessoa.id) throw new Error('Identidade ausente');

    const lista = (process.env.BETA_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const email = String(pessoa.email || '').toLowerCase();
    if ((lista.length && !lista.includes(email)) || !await conferirPermissao(token, 'meu_email_liberado')) {
      return { codigo: 403, erro: 'Esta conta ainda não está liberada para o beta.' };
    }
    if (await conferirPermissao(token, 'meu_acesso_bloqueado')) {
      return { codigo: 403, erro: bloqueio };
    }
    return { usuario: { ...pessoa, __token: token } };
  } catch (e) {
    const demora = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
    return { codigo: 503, erro: demora
      ? 'O servidor de contas não respondeu a tempo para conferir o seu acesso. Tente de novo em instantes'
      : 'Não foi possível conferir seu acesso. Tente de novo em instantes' };
  }
}

// A consulta antecipada permite exibir a cota antes de processar a entrada.
// A autorização do gasto é sempre a reserva atômica feita depois.
export async function cotaDoDia(usuario) {
  try {
    const cota = await consultar(usuario.__token, 'minha_cota_ia');
    return cota && Number.isFinite(cota.limite) && Number.isFinite(cota.usadas) ? cota : null;
  } catch (_) { return null; }
}

export function mensagemCota(cota) {
  return 'Você usou as ' + cota.limite + ' chamadas de IA de hoje. A cota volta amanhã, à meia-noite de Brasília.';
}

export async function reservarUsoIA(usuario, endpoint, caracteres) {
  try {
    const cota = await consultar(usuario.__token, 'reservar_uso_ia', { p_endpoint: endpoint, p_chars: caracteres });
    if (cota && cota.acesso_negado === true) {
      return { codigo: 403, corpo: { error: 'Esta conta não está liberada para usar a IA.' } };
    }
    if (!cota || typeof cota.reservada !== 'boolean' || !Number.isFinite(cota.limite) || !Number.isFinite(cota.usadas)) {
      throw new Error('Reserva inválida');
    }
    if (!cota.reservada) return { codigo: 429, corpo: { error: mensagemCota(cota), cota } };
    return null;
  } catch (_) {
    return { codigo: 503, corpo: { error: 'Não foi possível conferir a cota de IA. Tente novamente em instantes.' } };
  }
}
