// scripts/lib/tls-fontes.mjs — cadeia de certificados das fontes oficiais.
//
// Por que existe: www.stf.jus.br serve a cadeia TLS INCOMPLETA — manda só o certificado
// da folha, sem o intermediário. O curl e o Safari disfarçam (o macOS busca o
// intermediário por AIA e o guarda em cache); o Node não faz isso, e a consulta morria
// com "unable to verify the first certificate". Medido em 15/09/2026.
//
// A saída fácil seria desligar a verificação (rejectUnauthorized:false). Aqui NÃO se faz
// isso: sem verificação, qualquer intermediário na rede poderia inventar um informativo
// do STF, e o app anunciaria à pessoa uma novidade jurídica falsa. Em vez disso o
// intermediário legítimo do GlobalSign vai embutido, e a cadeia continua sendo conferida
// até uma raiz que o Node já confia.
//
// Quando o certificado do STF for trocado (a folha vence em 05/10/2026 e este
// intermediário em 21/05/2027), pegue o novo assim:
//   echo | openssl s_client -connect www.stf.jus.br:443 -servername www.stf.jus.br \
//     2>/dev/null | openssl x509 -noout -text | grep -A2 'Authority Information Access'
//   curl -s <URL do CA Issuers> | openssl x509 -inform DER -out novo.pem
// e substitua abaixo. tests/sentinela.mjs avisa quando a validade está perto do fim.
//
// Sem dependência nova: o fetch do Node não deixa acrescentar CA por host, então a busca
// das fontes passa por node:https, que aceita `ca` direto no request. (A regra da casa
// proíbe mexer nas dependências do projeto sem pedido.)
import https from 'node:https';
import tls from 'node:tls';
import { URL } from 'node:url';

/** GlobalSign GCC R6 AlphaSSL CA 2025 — intermediário de *.stf.jus.br.
 *  Emissor: GlobalSign Root CA - R6 (raiz já confiada pelo Node).
 *  Válido de 21/05/2025 a 21/05/2027. */
export const CA_ALPHASSL_2025 = `-----BEGIN CERTIFICATE-----
MIIFjTCCA3WgAwIBAgIRAIN9TriekS/nLK07x2kt3CAwDQYJKoZIhvcNAQELBQAw
TDEgMB4GA1UECxMXR2xvYmFsU2lnbiBSb290IENBIC0gUjYxEzARBgNVBAoTCkds
b2JhbFNpZ24xEzARBgNVBAMTCkdsb2JhbFNpZ24wHhcNMjUwNTIxMDIzNjUyWhcN
MjcwNTIxMDAwMDAwWjBVMQswCQYDVQQGEwJCRTEZMBcGA1UEChMQR2xvYmFsU2ln
biBudi1zYTErMCkGA1UEAxMiR2xvYmFsU2lnbiBHQ0MgUjYgQWxwaGFTU0wgQ0Eg
MjAyNTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAJ/oiu0Bviq52UUE
ADbFWmgu3rC7KDSMoorLN1Wd03McG3Z1aP71DlPCE33838r72Dfuj5M9LXfiQLJp
Au6MwNExmKOzothw4x0zGf5oBYyrCMGm3fBpLPafwYQ3MchBOWMTbf83rKUPLH48
KCJ0MnU8GUl8oA/J81wIvbbKPuNrFf6hvJDccjzc4NyxLz3A89zjV2g5whCg5O0u
9YX4Zxk9JHuc/LvllOJO4waAYLjbWBJkz3rV3ts1SmSYnJqmyRTIjXwQgRvhEYqt
DbRskt0W7M6cPwCze3GTBN2UHNpHkMs3YmVxku68I0aOQn5+uz//fDROP3z1Z/7I
APteRtECAwEAAaOCAV8wggFbMA4GA1UdDwEB/wQEAwIBhjAdBgNVHSUEFjAUBggr
BgEFBQcDAQYIKwYBBQUHAwIwEgYDVR0TAQH/BAgwBgEB/wIBADAdBgNVHQ4EFgQU
xbSTj28r3B5Iv7cQMIXO0bK7SC0wHwYDVR0jBBgwFoAUrmwFo5MT4qLn4tcc1sfw
f8hnU6AwewYIKwYBBQUHAQEEbzBtMC4GCCsGAQUFBzABhiJodHRwOi8vb2NzcDIu
Z2xvYmFsc2lnbi5jb20vcm9vdHI2MDsGCCsGAQUFBzAChi9odHRwOi8vc2VjdXJl
Lmdsb2JhbHNpZ24uY29tL2NhY2VydC9yb290LXI2LmNydDA2BgNVHR8ELzAtMCug
KaAnhiVodHRwOi8vY3JsLmdsb2JhbHNpZ24uY29tL3Jvb3QtcjYuY3JsMCEGA1Ud
IAQaMBgwCAYGZ4EMAQIBMAwGCisGAQQBoDIKAQMwDQYJKoZIhvcNAQELBQADggIB
AB/uvBuZf4CiuSahwiXn4geF52roAH+6jxsEPTXTfb7bbeMDXsYgRRsOTNA70ruZ
Tnz5DfFMuBhNoFhIFb0qR1izdy6VkdKOqFPNF2dOFI1EcnY9l2ory9mrzHqVbrL4
vzUd17FLUVyjTVU7PAv4nxyhnO1GTeT83YlrdRF31NyR6bvZVTEERHmpbWSgeveJ
LRtaMzlGWiLZ8IwkH7o6GH3jp/KPtDW4Npu8w64HrRZdN2pqQhi7+YKwfHM7H+2U
dM1BGN0sjOWMVbMSB9MtCsleS2Mb7TRZEbOHxECJLLIluQypZr7Pol3+hAqrhyKI
k+6y+Da0NeDuWxW59Ku4NvClqW1UFX1SpfNGhzVfp/CH+vPM1tySomx2jE0EnYZu
GwVucXPBsp5nUWqUV9+143glVuS7GTg9hFPjNBInn17HbCoIIQIOzj5Vd9bK3A9U
GxXNpwenDHEalCsD/4eQYDHPhFE7sNe0D/OXu+FAM02VZkARx37Jp4bDdujvgL9P
vZPR3wThvDN1CTU8Bc3xea3yKFAraKcPZLkhReQUAm2VpR+HSJRPlUpYizlF9WkL
h3KcAVCBJWvnOkVwxyU5QJMcnwW95JlOtx+9100GL99jHE5rs3gXp7F4bg8H01QT
9jVOhBBmQ7nQoXuwI0tqal2QUqZz3eeu62CU7xBwtfYR
-----END CERTIFICATE-----`;

/** Raízes de fábrica do Node + o intermediário que o STF esquece de mandar. */
const CAS = [...tls.rootCertificates, CA_ALPHASSL_2025];

export const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36';

/** Hosts oficiais que este vigia pode ler. Lista fechada: sem ela a função serverless
 *  viraria proxy aberto (SSRF), do mesmo jeito que api/law.js já se protege. */
export const HOSTS = [/^(www\.)?planalto\.gov\.br$/i, /^(www\.)?stf\.jus\.br$/i, /^processo\.stj\.jus\.br$/i];
export const hostPermitido = (h) => HOSTS.some((re) => re.test(h));

/** GET numa fonte oficial, com a cadeia completada e a verificação LIGADA.
 *  Se o certificado não fechar cadeia, isto lança — e lançar é o comportamento certo:
 *  vira "não foi possível consultar a fonte", nunca "nenhuma novidade encontrada".
 *  Redirecionamentos são seguidos à mão, revalidando o host a cada salto.
 *  `timeoutMs` mede só o SILÊNCIO do socket: página grande chegando devagar passa dele.
 *  `prazo` (epoch ms, opcional) é o teto ABSOLUTO da leitura, saltos incluídos — é o que a
 *  função serverless usa para responder antes do maxDuration da Vercel. Sem prazo (rotina
 *  diária), nada muda. */
export function buscarFonte(url, { timeoutMs = 40000, saltos = 4, prazo = 0 } = {}) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(url); } catch (_) { return reject(new Error('URL inválida')); }
    if (u.protocol !== 'https:' || !hostPermitido(u.hostname)) return reject(new Error('host fora da lista de fontes oficiais: ' + u.hostname));
    if (prazo && Date.now() >= prazo) return reject(new Error('tempo da consulta esgotado'));
    let teto = null;
    const fim = () => { if (teto) { clearTimeout(teto); teto = null; } };
    const req = https.request(u, {
      method: 'GET',
      headers: { 'user-agent': UA, accept: 'text/html,*/*' },
      // ACRESCENTA ao depósito de raízes do Node. Passar só o intermediário SUBSTITUIRIA
      // o depósito inteiro, e aí quem quebraria seria o Planalto.
      ca: CAS,
      rejectUnauthorized: true,
      timeout: timeoutMs,
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && saltos > 0) {
        fim();
        res.resume();
        const prox = new URL(res.headers.location, u).toString();
        return resolve(buscarFonte(prox, { timeoutMs, saltos: saltos - 1, prazo }));
      }
      const pedacos = [];
      res.on('data', (c) => pedacos.push(c));
      res.on('end', () => { fim(); resolve({ status: res.statusCode, buffer: Buffer.concat(pedacos) }); });
      res.on('error', (e) => { fim(); reject(e); });
    });
    if (prazo) {
      teto = setTimeout(() => {
        const e = new Error('tempo da consulta esgotado');
        req.destroy(e);
        reject(e);
      }, Math.max(0, prazo - Date.now()));
    }
    req.on('timeout', () => { req.destroy(new Error('tempo esgotado ao ler a fonte')); });
    req.on('error', (e) => { fim(); reject(e); });
    req.end();
  });
}
