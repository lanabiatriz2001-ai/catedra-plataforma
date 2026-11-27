// juridico.js — GERADO por scripts/build-juridico.mjs a partir de docs/juridico/*.md. Não editar à mão.
// A versão vigente do aceite é "termos/privacidade"; catedra:aceite guarda {versao, ts}.
// data (ISO) e dataBR são de CADA documento; rodape é a linha "Título · versão X · DD/MM/AAAA" que o app mostra.
(function (raiz) {
  var J = {"versao":"1.0/1.3","termos":{"versao":"1.0","data":"2026-09-02","dataBR":"02/09/2026","titulo":"Termos de uso","arquivo":"termos.html","rodape":"Termos de uso · versão 1.0 · 02/09/2026"},"privacidade":{"versao":"1.3","data":"2026-11-25","dataBR":"25/11/2026","titulo":"Política de privacidade","arquivo":"privacidade.html","rodape":"Política de privacidade · versão 1.3 · 25/11/2026"}};
  /** true quando o aceite guardado ({versao, ts}, objeto ou JSON) é da versão vigente. Puro, sem estado. */
  J.aceiteVigente = function (v) { try { if (typeof v === "string") v = JSON.parse(v); } catch (e) { return false; } return !!(v && v.versao === J.versao && +v.ts > 0); };
  raiz.CT_JURIDICO = J;
})(typeof window !== "undefined" ? window : globalThis);
