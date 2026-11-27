// juridico.js — GERADO por scripts/build-juridico.mjs a partir de docs/juridico/*.md. Não editar à mão.
// A versão vigente do aceite é "termos/privacidade"; catedra:aceite guarda {versao, ts}.
(function (raiz) {
  var J = {"versao":"1.0/1.2","termos":{"versao":"1.0","data":"2026-09-02","titulo":"Termos de uso","arquivo":"termos.html"},"privacidade":{"versao":"1.2","data":"2026-10-01","titulo":"Política de privacidade","arquivo":"privacidade.html"}};
  /** true quando o aceite guardado ({versao, ts}, objeto ou JSON) é da versão vigente ou de uma mais nova: termos e
      privacidade comparados em separado, cada um maior ou igual ao vigente, parte a parte e só com números. A versão
      idêntica à vigente sempre vale; outra fora do formato ou com outro número de documentos = false. Puro, sem estado. */
  J.aceiteVigente = function (v) { try { if (typeof v === "string") v = JSON.parse(v); } catch (e) { return false; } if (!(v && typeof v.versao === "string" && +v.ts > 0)) return false; if (v.versao === J.versao) return true; var a = v.versao.split("/"), b = J.versao.split("/"); if (a.length !== b.length) return false; for (var i = 0; i < b.length; i++) { if (!/^\d+(\.\d+)*$/.test(a[i]) || !/^\d+(\.\d+)*$/.test(b[i])) return false; var x = a[i].split("."), y = b[i].split("."), c = 0; for (var k = 0; k < Math.max(x.length, y.length) && !c; k++) { var p = +(x[k] || 0), q = +(y[k] || 0); c = p > q ? 1 : p < q ? -1 : 0; } if (c < 0) return false; } return true; };
  raiz.CT_JURIDICO = J;
})(typeof window !== "undefined" ? window : globalThis);
