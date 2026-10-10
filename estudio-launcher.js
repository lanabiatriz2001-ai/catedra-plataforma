/* Estúdio de Materiais — entrada isolada no menu, sem alterar o roteador do host.
 * Link nativo para um HTML local; nenhuma alteração de estado ou sincronização. */
(function (w, d) {
  'use strict';
  var ID = 'ct-estudio-materiais-entry';
  var agendado = false;
  function inserir() {
    agendado = false;
    var alvo = d.querySelector('aside button[data-view="areamod"]') ||
               d.querySelector('aside button[data-view="legis"]') ||
               d.querySelector('aside button[data-view]');
    if (!alvo || !alvo.parentNode) return;
    var menu = alvo.closest('aside');
    if (!menu || menu.querySelector('#' + ID)) return;
    var link = d.createElement('a');
    link.id = ID;
    link.href = './estudio-materiais.html';
    link.textContent = 'Estúdio de Materiais';
    link.title = 'Leitura de PDF, áudio e estudo ativo offline';
    link.style.cssText = [
      'display:flex', 'align-items:center', 'min-height:44px',
      'padding:10px 14px', 'margin:6px 0', 'border-radius:var(--r-md,11px)',
      'background:var(--surface2,transparent)', 'border:1px solid var(--border,currentColor)',
      'color:var(--ink,inherit)', 'font:inherit', 'text-decoration:none'
    ].join(';');
    link.addEventListener('focus', function(){ link.style.outline='3px solid var(--accent,currentColor)'; });
    link.addEventListener('blur', function(){ link.style.outline=''; });
    alvo.insertAdjacentElement('afterend', link);
  }
  function agendar() {
    if (agendado) return;
    agendado = true;
    w.requestAnimationFrame(inserir);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', agendar);
  else agendar();
  if (w.MutationObserver) {
    var observer = new MutationObserver(function () { agendar(); });
    var observar = function () { if (d.body) observer.observe(d.body, { childList: true, subtree: true }); };
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', observar);
    else observar();
  }
})(window, document);
