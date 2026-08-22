/* tema-satelite.js — um tema só para a plataforma inteira (item D1).
 *
 * As páginas satélites (LEGIS, JURIS, ritos, peças, 2ª fase, prioridade, módulo da área)
 * são HTML independentes, carregados em <iframe> pelo app. Cada uma nasceu com paleta
 * própria fixa — ritos e 2ª fase em vinho, LEGIS e JURIS em verde —, e nenhuma respeitava
 * a cor de destaque escolhida nos Ajustes nem o modo escuro: com o app escuro, o iframe
 * continuava claro e piscava branco a cada troca de tela.
 *
 * Como funciona: ao carregar, a página avisa o host (`ctPronto`) e ele responde com os
 * tokens atuais (`ctTheme`). O host REENVIA a cada mudança de tema. Como todo o CSS dos
 * satélites usa `var(--x, padrão)`, abrir a página avulsa (sem host) mantém a cara
 * original — o fallback continua valendo.
 *
 * Regra: usar os tokens PRONTOS do host, nunca derivar cor aqui. O host já calcula o
 * contraste (`--onAccent`); recalcular do lado de cá daria dois resultados diferentes
 * para a mesma tela.
 */
(function () {
  'use strict';
  if (window.__ctTemaSatelite) return;
  window.__ctTemaSatelite = true;

  var V = ['--bg', '--surface', '--surface2', '--border', '--ink', '--text', '--text2', '--text3',
           '--accent', '--accentD', '--accentSoft', '--accentRing', '--onAccent',
           '--ok', '--warn', '--danger', '--radius', '--r-sm', '--r-md',
           '--display', '--body', '--mono', '--heroGrad'];

  function aplicar(t) {
    if (!t) return;
    var r = document.documentElement;
    V.forEach(function (v) {
      var val = t[v];
      if (val && String(val).trim()) r.style.setProperty(v, String(val).trim());
    });
    // O modo escuro do host precisa chegar ao esquema de cores nativo (barras de rolagem,
    // seleção, controles de formulário) — só trocar as vars deixaria isso claro no escuro.
    if (t.__dark != null) {
      try { r.style.colorScheme = t.__dark ? 'dark' : 'light'; } catch (e) {}
    }
    try { document.documentElement.setAttribute('data-ct-tema', '1'); } catch (e) {}
  }

  /* Atalho: mesma origem permite ler o host direto, sem esperar a resposta — evita o
     flash de tema antigo no primeiro quadro. Se a origem for diferente, o try falha e
     seguimos pelo postMessage, que é o caminho normal. */
  function tentarDireto() {
    try {
      var pw = window.parent;
      if (!pw || pw === window) return false;
      var host = pw.document.querySelector('[style*="--accent"]');
      if (!host) return false;
      var cs = pw.getComputedStyle(host);
      var t = {};
      V.forEach(function (v) { t[v] = cs.getPropertyValue(v); });
      try { t.__dark = pw.document.documentElement.classList.contains('dark')
        || /(^|\s)dark(\s|$)/.test(pw.document.body.className || ''); } catch (e) {}
      aplicar(t);
      return true;
    } catch (e) { return false; }
  }

  window.addEventListener('message', function (e) {
    if (e && e.data && e.data.type === 'ctTheme' && e.data.tokens) aplicar(e.data.tokens);
  });

  function avisar() {
    try {
      if (window.parent && window.parent !== window) {
        // `ctPronto` é o aviso novo; `ctChecklistReady` fica por compatibilidade com o
        // host antigo (bundle já publicado no app nativo, que pode estar atrás).
        window.parent.postMessage({ type: 'ctPronto', pagina: location.pathname.split('/').pop() }, '*');
        window.parent.postMessage({ type: 'ctChecklistReady' }, '*');
      }
    } catch (e) {}
  }

  tentarDireto();
  avisar();
  // A página pode carregar antes do host montar o listener: pede de novo uma vez.
  setTimeout(avisar, 400);
})();
