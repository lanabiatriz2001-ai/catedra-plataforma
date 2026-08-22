/* ==========================================================================
   qualidade-texto.mjs — as heurísticas de deformação de texto extraído de PDF,
   em um lugar só.

   Por quê: o portão (`auditar-provas.mjs --portao`) e o build que publica os
   textos (`build-provas-conteudo.mjs`) precisam usar EXATAMENTE o mesmo
   critério. Se o build publicasse por uma régua e o portão medisse por outra,
   o portão viveria vermelho sem que ninguém pudesse consertá-lo — e a regra
   "texto que reprova não é publicado" viraria letra morta.

   Uso: `import { audita, juntaEspelho } from './qualidade-texto.mjs'`.
   ========================================================================== */

// A capa/instruções do caderno entrou como se fosse o enunciado.
const RE_INSTRUCOES = /N[ÃA]O\s+SER[ÁA]\s+PERMITIDO|INFORMA[ÇC][ÕO]ES\s+GERAIS|SUA\s+PROVA\b|retirar-?se\s+da\s+sala|ser[áa]\s+eliminado\s+do\s+concurso|fiscal\s+de\s+sala|caderno\s+de\s+(?:provas?|quest[õo]es)\s+e\s+a\s+folha/i;

export function temInstrucoesDeCaderno(txt) {
  // só conta quando aparece no PRIMEIRO terço — instruções no fim são anexo legítimo raro
  const cabeca = txt.slice(0, Math.max(1200, Math.floor(txt.length / 3)));
  return RE_INSTRUCOES.test(cabeca);
}

// Cabeçalho/rodapé de página vazando: a mesma linha longa repetida várias vezes.
export function temCabecalhoRepetido(txt) {
  const cont = {};
  for (const l of txt.split('\n')) {
    const s = l.trim();
    if (s.length < 20) continue;
    cont[s] = (cont[s] || 0) + 1;
    if (cont[s] >= 4) return true;
  }
  return false;
}

// Extração falhou ou PDF é imagem: sobrou texto de menos para ser uma prova real.
export const CURTO_MIN = 300;

// Lixo de codificação: proporção alta de caracteres fora do esperado em português.
export function proporcaoLixo(txt) {
  if (!txt.length) return 0;
  //   (espaço não-quebrável) e ­ (hífen suave) são normais em texto de banca.
  // Também são: ‐ (hífen tipográfico), − (sinal de menos), ⸺ (travessão longo), ≤ ≥ ± × ÷,
  // ² ³ ½ ¼ ¾ e ´ ` ‹ › « » — tudo isso é caractere DECODIFICADO CERTO. Contá-los como lixo
  // reprovava padrão de resposta são só porque a banca escreveu "0 ≤ nota ≤ 2".
  // Os invisíveis vão por CÓDIGO (\u00A0 espaço não-quebrável, \u00AD hífen suave): escritos
  // como caractere literal, eles somem em qualquer reedição desta linha — e foi assim que
  // 8 perguntas da oral passaram a reprovar por 'lixo' que era só espaço não-quebrável.
  const lixo = (txt.match(/[^\x20-\x7E\u00A0\u00AD\u00C0-\u00FF§ºª°–—‐−⸺‘’“”…•·≤≥±×÷²³¹½¼¾´`‹›«»→←↔\n\r\t]/g) || []).length;
  return lixo / txt.length;
}

// Códigos internos do PDF da banca vazando no texto (ex.: <<D01_dAdm_A0100422_...>>).
const RE_MARCADOR_INTERNO = /<<[A-Za-z0-9_]{6,}>>|\[\[[A-Za-z0-9_]{6,}\]\]/;

/** Devolve a lista de sintomas do texto. Vazia = texto publicável. */
export function audita(txt, { minChars = CURTO_MIN } = {}) {
  const t = String(txt || '');
  const problemas = [];
  if (t.length < minChars) problemas.push('curto');
  else {
    if (temInstrucoesDeCaderno(t)) problemas.push('instrucoes-de-caderno');
    if (temCabecalhoRepetido(t)) problemas.push('cabecalho-repetido');
    if (RE_MARCADOR_INTERNO.test(t)) problemas.push('marcador-interno');
    if (proporcaoLixo(t) > 0.02) problemas.push('lixo-encoding');
  }
  return problemas;
}

/** O espelho pode estar em três formas; auditar todas pelo texto que a pessoa lê.
 *
 *  Armadilha real: o espelho estruturado é um array de OBJETOS `{quesito, pontos}`.
 *  Um `array.join('\n')` devolve "[object Object]" — e a auditoria acusava 59 espelhos
 *  de "curto" quando o defeito era do próprio medidor.
 */
export function juntaEspelho(bruto) {
  if (bruto == null) return '';
  if (Array.isArray(bruto)) {
    return bruto.map((q) => {
      if (q && typeof q === 'object') {
        return [q.quesito, q.escala].filter(Boolean).join(' — ');
      }
      return String(q);
    }).join('\n').trim();
  }
  return String(bruto).trim();
}
