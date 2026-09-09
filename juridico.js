// juridico.js — GERADO por scripts/build-juridico.mjs a partir de docs/juridico/*.md. Não editar à mão.
// A versão vigente do aceite é "termos/privacidade"; catedra:aceite guarda {versao, ts}.
(function (raiz) {
  var J = {"versao":"1.0/1.0","termos":{"versao":"1.0","data":"2026-09-02","titulo":"Termos de uso","arquivo":"termos.html"},"privacidade":{"versao":"1.0","data":"2026-09-02","titulo":"Política de privacidade","arquivo":"privacidade.html"}};
  /** true quando o aceite guardado ({versao, ts}, objeto ou JSON) é da versão vigente. Puro, sem estado. */
  J.aceiteVigente = function (v) { try { if (typeof v === "string") v = JSON.parse(v); } catch (e) { return false; } return !!(v && v.versao === J.versao && +v.ts > 0); };
  raiz.CT_JURIDICO = J;
})(typeof window !== "undefined" ? window : globalThis);
