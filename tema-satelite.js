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

  /* ===== D2: MODO EMBUTIDO (?embed=1) ==================================================
     Dentro do app, o satélite repetia a identidade que a tela já mostra: ícone grande,
     título em h1 e subtítulo — uns 100 px verticais de "CátedraLEGIS" para quem já está
     no CátedraLEGIS. Com ?embed=1 o cabeçalho vira uma linha fina; aberto direto pela URL,
     nada muda.

     O CSS mora AQUI e não em cada página: são sete satélites, e sete cópias divergiriam. */
  function modoEmbutido() {
    var embed = false;
    try { embed = new URLSearchParams(location.search).get('embed') === '1'; } catch (e) {}
    if (!embed) return;
    try { document.documentElement.setAttribute('data-ct-embed', '1'); } catch (e) {}
    var css = document.createElement('style');
    css.textContent = [
      /* família .head (LEGIS, JURIS, módulo da área) */
      '[data-ct-embed] .head{gap:9px;margin-bottom:8px;align-items:baseline}',
      '[data-ct-embed] .head .ic{display:none}',
      '[data-ct-embed] .head h1{font-size:15px;font-weight:700;margin:0;letter-spacing:0}',
      '[data-ct-embed] .head p{display:none}',
      /* família .brand (ritos, peças, 2ª fase, prioridade) */
      '[data-ct-embed] .brand{gap:8px}',
      '[data-ct-embed] .brand .ic{display:none}',
      '[data-ct-embed] .brand b{font-size:14px}',
      '[data-ct-embed] .brand small{display:none}',
      /* A barra do topo também aperta: com o cabeçalho em uma linha, o padding de 12–13px
         de cada lado é respiro para uma identidade que não está mais ali. */
      '[data-ct-embed] .l1{padding-top:7px;padding-bottom:7px}',
      /* o respiro do topo também encolhe: o app já dá o seu */
      '[data-ct-embed] .wrap{padding-top:10px}',
      '[data-ct-embed] body{padding-top:0}'
    ].join('');
    (document.head || document.documentElement).appendChild(css);
  }

  modoEmbutido();
  tentarDireto();
  avisar();
  // A página pode carregar antes do host montar o listener: pede de novo uma vez.
  setTimeout(avisar, 400);
})();
