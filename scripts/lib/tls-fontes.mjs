// scripts/lib/tls-fontes.mjs — cadeia de certificados das fontes oficiais.
//
// Histórico: até setembro de 2026 www.stf.jus.br servia a cadeia TLS INCOMPLETA (só a folha,
// sem o intermediário GlobalSign AlphaSSL), e o intermediário ia embutido aqui. Em 01/10/2026 o
// STF trocou o certificado: hoje é *.stf.jus.br emitido por "Sectigo Public Server
// Authentication CA DV R36", válido até 11/04/2027, com a cadeia COMPLETA (folha, DV R36, Root
// R46) — conferido em 02/10/2026 com as raízes de fábrica do Node, em www.stf.jus.br e
// portal.stf.jus.br. O intermediário embutido ficou obsoleto e saiu: guardar certificado que a
// fonte não usa só fazia a régua (S12) falhar por um vencimento que não importa mais.
//
// A regra continua: a verificação NUNCA é desligada (rejectUnauthorized:false). Sem ela,
// qualquer intermediário na rede poderia inventar um informativo do STF, e o app anunciaria à
// pessoa uma novidade jurídica falsa. Se o STF voltar a mandar a cadeia incompleta, a consulta
// falha com "unable to verify the first certificate" (vira "não foi possível consultar", nunca
// "sem novidade"); aí o intermediário volta para CAS_EXTRAS, pego assim:
//   echo | openssl s_client -connect www.stf.jus.br:443 -servername www.stf.jus.br \
//     2>/dev/null | openssl x509 -noout -text | grep -A2 'Authority Information Access'
//   curl -s <URL do CA Issuers> | openssl x509 -inform DER -out novo.pem
// tests/sentinela.mjs (S12) avisa quando um certificado embutido está perto de vencer.
//
// Sem dependência nova: a busca das fontes passa por node:https, que aceita `ca` direto no
// request. (A regra da casa proíbe mexer nas dependências do projeto sem pedido.)
import https from 'node:https';
import tls from 'node:tls';
import { URL } from 'node:url';

/** Intermediários embutidos (PEM), ACRESCENTADOS às raízes do Node. Vazio desde 01/10/2026:
 *  nenhuma fonte oficial lida aqui manda cadeia incompleta. */
export const CAS_EXTRAS = [];
const CAS = CAS_EXTRAS.length ? [...tls.rootCertificates, ...CAS_EXTRAS] : undefined;

export const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36';

/** Identificação por fonte (medido do Mac em 03/10/2026, mesma rede e TLS verificado):
 *  · STJ aceita um identificador honesto: 200 no Informativo e nos repetitivos. Então o STJ
 *    é lido dizendo o que é.
 *  · STF responde 403 no balanceador da AWS (awselb/2.0) a qualquer identificador que não seja
 *    de navegador, inclusive a este honesto; o Planalto derruba a conexão (ECONNRESET). Por
 *    decisão da dona (03/10/2026), os dois seguem lidos com o identificador de Chrome: páginas
 *    públicas oficiais, da rede dela, em volume baixo (dezenas de pedidos por dia). É uma
 *    escolha consciente, não um descuido: o filtro do STF existe para barrar robôs, e este
 *    vigia passa por ele se apresentando como navegador. Se o STF abrir rota de dados abertos
 *    ou acesso formal, trocar aqui. */
export const UA_HONESTO = 'Catedra/1.0 (+https://github.com/lanabiatriz2001-ai/catedra-plataforma; leitura de dados oficiais)';
export const uaPara = (host) => (/(^|\.)stj\.jus\.br$/i.test(String(host)) ? UA_HONESTO : UA);

/** Hosts oficiais que este vigia pode ler. Lista fechada: sem ela a função serverless
 *  viraria proxy aberto (SSRF), do mesmo jeito que api/law.js já se protege.
 *  Fase 2 (01/10/2026): portal.stf.jus.br (repercussão geral e súmulas do STF) e
 *  www.stj.jus.br (o PDF de súmulas do STJ). Seguem FORA, de propósito: scon.stj.jus.br e
 *  jurisprudencia.stf.jus.br (desafio anti-robô, não se contorna) e bdjur.stj.jus.br.
 *  03/10/2026: entra dadosabertos.web.stj.jus.br, o Portal de Dados Abertos do STJ (Temas.csv dos
 *  precedentes qualificados, usado como filtro das faixas de repetitivos). */
export const HOSTS = [/^(www\.)?planalto\.gov\.br$/i, /^(www\.|portal\.)?stf\.jus\.br$/i, /^(processo|www|dadosabertos\.web)\.stj\.jus\.br$/i];
export const hostPermitido = (h) => HOSTS.some((re) => re.test(h));

/** Só os cabeçalhos do GET condicional passam (o PDF de súmulas do STJ: 304 = nada mudou).
 *  Qualquer outro é descartado — a função serverless não repassa cabeçalho arbitrário. */
const CAB_OK = ['if-modified-since', 'if-none-match'];
export const cabecalhosPermitidos = (o) => Object.fromEntries(Object.entries(o || {})
  .filter(([k, v]) => CAB_OK.includes(String(k).toLowerCase()) && typeof v === 'string' && v && !/[\r\n]/.test(v))
  .map(([k, v]) => [String(k).toLowerCase(), v]));

// O erro de rede chega à tela e ao resumo do workflow: em português, com o host e a causa
// técnica entre parênteses ("getaddrinfo ENOTFOUND" sozinho não diz nada a quem estuda).
const CAUSAS = {
  ENOTFOUND: 'o endereço da fonte não foi encontrado (DNS)',
  EAI_AGAIN: 'o endereço da fonte não respondeu à consulta de DNS',
  ECONNREFUSED: 'a fonte recusou a conexão',
  ECONNRESET: 'a fonte encerrou a conexão no meio da leitura',
  ETIMEDOUT: 'a conexão com a fonte esgotou o tempo',
  EHOSTUNREACH: 'a rede não alcança a fonte',
  ENETUNREACH: 'sem rede até a fonte',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'o certificado da fonte não fecha a cadeia de confiança',
  CERT_HAS_EXPIRED: 'o certificado da fonte está vencido',
  DEPTH_ZERO_SELF_SIGNED_CERT: 'a fonte apresentou certificado autoassinado',
  ERR_TLS_CERT_ALTNAME_INVALID: 'o certificado não é do endereço da fonte',
};
export function erroPorExtenso(e, host) {
  if (!e || e.porExtenso) return e;
  const cod = e.code || '';
  const causa = CAUSAS[cod] || (/certificate/i.test(e.message || '') ? 'o certificado da fonte não pôde ser verificado' : null);
  if (!causa) return e;
  const n = new Error(`${causa}${host ? ' — ' + host : ''} (${cod || e.message})`);
  n.code = cod; n.porExtenso = true;
  return n;
}

/** GET numa fonte oficial, com a cadeia completada e a verificação LIGADA.
 *  Se o certificado não fechar cadeia, isto lança — e lançar é o comportamento certo:
 *  vira "não foi possível consultar a fonte", nunca "nenhuma novidade encontrada".
 *  Redirecionamentos são seguidos à mão, revalidando o host a cada salto.
 *  `timeoutMs` mede só o SILÊNCIO do socket: página grande chegando devagar passa dele.
 *  `prazo` (epoch ms, opcional) é o teto ABSOLUTO da leitura, saltos incluídos — é o que a
 *  função serverless usa para responder antes do maxDuration da Vercel. Sem prazo (rotina
 *  diária), nada muda. `cabecalhos`: só os do GET condicional (cabecalhosPermitidos).
 *  Devolve { status, buffer, headers }. */
export function buscarFonte(url, { timeoutMs = 40000, saltos = 4, prazo = 0, cabecalhos } = {}) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(url); } catch (_) { return reject(new Error('URL inválida')); }
    if (u.protocol !== 'https:' || !hostPermitido(u.hostname)) return reject(new Error('host fora da lista de fontes oficiais: ' + u.hostname));
    if (prazo && Date.now() >= prazo) return reject(new Error('tempo da consulta esgotado'));
    let teto = null;
    const fim = () => { if (teto) { clearTimeout(teto); teto = null; } };
    const req = https.request(u, {
      method: 'GET',
      headers: { 'user-agent': uaPara(u.hostname), accept: 'text/html,*/*', ...cabecalhosPermitidos(cabecalhos) },
      // Sem extras: as raízes de fábrica do Node. Com extras, ACRESCENTA ao depósito (passar
      // só o intermediário SUBSTITUIRIA o depósito inteiro, e aí quem quebraria seria o Planalto).
      ca: CAS,
      rejectUnauthorized: true,
      timeout: timeoutMs,
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && saltos > 0) {
        fim();
        res.resume();
        const prox = new URL(res.headers.location, u).toString();
        return resolve(buscarFonte(prox, { timeoutMs, saltos: saltos - 1, prazo, cabecalhos }));
      }
      const pedacos = [];
      res.on('data', (c) => pedacos.push(c));
      res.on('end', () => { fim(); resolve({ status: res.statusCode, buffer: Buffer.concat(pedacos), headers: res.headers || {} }); });
      res.on('error', (e) => { fim(); reject(erroPorExtenso(e, u.hostname)); });
    });
    if (prazo) {
      teto = setTimeout(() => {
        const e = new Error('tempo da consulta esgotado');
        req.destroy(e);
        reject(e);
      }, Math.max(0, prazo - Date.now()));
    }
    req.on('timeout', () => { req.destroy(new Error('tempo esgotado ao ler a fonte')); });
    req.on('error', (e) => { fim(); reject(erroPorExtenso(e, u.hostname)); });
    req.end();
  });
}
