/* Stub para provar o D9: derruba toda saída de rede do processo do build.
   Usado por tests/run.mjs via NODE_OPTIONS=--require, sem tocar no build.mjs. */
globalThis.fetch = function () {
  return Promise.reject(new Error('rede bloqueada (stub de teste)'));
};
