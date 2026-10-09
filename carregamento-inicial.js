/* P20 — uma primeira pintura antes do React e dos acervos, sem liberar conteúdo por um prazo artificial.
   Não contém dados do estudo nem botões de navegação de mentira. */
(function () {
  if (document.getElementById('ct-carregamento')) return;
  var dir = 'clean', dark = false, baixa = false;
  try {
    dir = localStorage.getItem('catedra:dir') || dir;
    dark = localStorage.getItem('catedra:dark') === '1';
    if (localStorage.getItem('catedra:_temaAuto') === '1') dark = matchMedia('(prefers-color-scheme: dark)').matches;
    baixa = !!JSON.parse(localStorage.getItem('catedra:prefs') || '{}').baixaEstimulacao;
  } catch (_) {}
  var temas = window.CT_ABERTURA_TEMAS || {}, tema = Object.prototype.hasOwnProperty.call(temas, dir) ? temas[dir] : temas.sutil;
  var el = document.createElement('div');
  el.id = 'ct-carregamento'; el.setAttribute('data-baixa', baixa ? '1' : '0');
  if (tema) {
    var paleta = tema[dark ? 'dark' : 'light'];
    Object.keys(paleta).forEach(function (k) { el.style.setProperty('--' + k, paleta[k]); });
    ['display', 'body', 'radius'].forEach(function (k) { el.style.setProperty('--' + k, tema[k]); });
  }
  var linhas = '<div class="ct-carga-linha"></div><div class="ct-carga-linha"></div><div class="ct-carga-linha"></div>';
  el.innerHTML = '<aside class="ct-carga-lateral" aria-hidden="true"><div class="ct-carga-marca">Cátedra</div>' + linhas + linhas + '</aside>'
    + '<div class="ct-carga-miolo"><div class="ct-carga-cab" aria-hidden="true"><strong>Cátedra</strong> · Plataforma de estudos</div>'
    + '<div role="status" aria-live="polite"><h1>Preparando seu espaço de estudo</h1><p>Carregando a plataforma. Seus registros continuam guardados.</p></div>'
    + '<div class="ct-carga-bancada" aria-hidden="true"><div class="ct-carga-bloco">' + linhas + '</div><div class="ct-carga-bloco">' + linhas + '</div></div>'
    + '<div class="ct-carga-bloco ct-carga-fila" aria-hidden="true">' + linhas + '</div></div>';
  (document.body || document.documentElement).appendChild(el);
  // Só números e estados efêmeros: nada em storage, rede, notas ou identificação.
  var medidas = window.CT_ABERTURA_METRICAS = { inicio: performance.now(), estado: 'carregando' };
  var raizProtegida = null, inertAnterior = false;
  var prazo = setTimeout(demorou, 20000);
  var observador = new MutationObserver(conferir);
  function proteger() {
    var raiz = document.getElementById('dc-root');
    if (raiz && raiz !== raizProtegida) {
      raizProtegida = raiz; inertAnterior = raiz.hasAttribute('inert');
      raiz.setAttribute('inert', '');
    }
  }
  function recuperar() {
    if (el.querySelector('button')) return;
    var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Tentar novamente';
    b.onclick = function () { location.reload(); };
    el.querySelector('[role="status"]').appendChild(b);
  }
  function demorou() {
    if (!el.parentNode) return;
    medidas.estado = 'demorado';
    var estado = el.querySelector('[role="status"]');
    estado.querySelector('h1').textContent = 'A abertura está levando mais tempo';
    estado.querySelector('p').textContent = 'Você pode aguardar ou tentar novamente. Seus registros continuam guardados neste aparelho.';
    recuperar();
  }
  function conferir() {
    proteger();
    // O contêiner vazio do React ainda não é uma tela. Aguarda o main real, inclusive
    // quando ele está protegido pelo portão de acesso (que tem prioridade própria).
    // No artefato gerado, aguarda também o CSS completo: retirar a casca antes dele
    // exporia por um instante toda a interface sem estilo.
    if (!document.querySelector('#dc-root #ct-main')) return;
    if (window.CT_CSS_ESPERADO && !window.CT_CSS_PRONTO) return;
    clearTimeout(prazo);
    medidas.pronto = performance.now(); medidas.duracao = medidas.pronto - medidas.inicio; medidas.estado = 'pronto';
    if (raizProtegida && !inertAnterior) raizProtegida.removeAttribute('inert');
    observador.disconnect();
    window.removeEventListener('error', falhou);
    window.removeEventListener('unhandledrejection', falhou);
    window.removeEventListener('ct-css-pronto', conferir);
    window.removeEventListener('ct-css-falhou', falhou);
    if (el.parentNode) el.parentNode.removeChild(el);
  }
  function falhou() {
    if (!el.parentNode) return;
    clearTimeout(prazo); medidas.estado = 'falhou';
    var estado = el.querySelector('[role="status"]');
    estado.querySelector('h1').textContent = 'Não foi possível concluir a abertura';
    estado.querySelector('p').textContent = 'Seus registros não foram apagados. Tente abrir a plataforma novamente.';
    recuperar();
  }
  observador.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('error', falhou);
  window.addEventListener('unhandledrejection', falhou);
  window.addEventListener('ct-css-pronto', conferir);
  window.addEventListener('ct-css-falhou', falhou);
  document.addEventListener('DOMContentLoaded', function () {
    if (el.parentNode && document.body && el.parentNode !== document.body) document.body.appendChild(el);
    conferir();
  });
  conferir();
})();
