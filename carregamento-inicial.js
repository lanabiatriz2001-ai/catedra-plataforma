/* P20 — uma primeira pintura antes do React e dos acervos, sem prazo artificial.
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
  var observador = new MutationObserver(conferir);
  function conferir() {
    // O contêiner vazio do React ainda não é uma tela. Aguarda o main real, inclusive
    // quando ele está protegido pelo portão de acesso (que tem prioridade própria).
    if (!document.querySelector('#dc-root #ct-main')) return;
    observador.disconnect();
    window.removeEventListener('error', falhou);
    window.removeEventListener('unhandledrejection', falhou);
    if (el.parentNode) el.parentNode.removeChild(el);
  }
  function falhou() {
    if (!el.parentNode || el.querySelector('button')) return;
    var estado = el.querySelector('[role="status"]');
    estado.querySelector('h1').textContent = 'Não foi possível concluir a abertura';
    estado.querySelector('p').textContent = 'Seus registros não foram apagados. Tente abrir a plataforma novamente.';
    var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Tentar novamente';
    b.onclick = function () { location.reload(); }; estado.appendChild(b);
  }
  observador.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('error', falhou);
  window.addEventListener('unhandledrejection', falhou);
  document.addEventListener('DOMContentLoaded', function () {
    if (el.parentNode && document.body && el.parentNode !== document.body) document.body.appendChild(el);
    conferir();
  });
  conferir();
})();
