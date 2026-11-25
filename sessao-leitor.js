/* Os leitores usam a sessão e o armazenamento do Cátedra que montou o iframe.
   A página avulsa encaminha o endereço ao login; o acervo fica inerte em <template>. */
(function () {
  'use strict';

  window.ctAutorizarLeitor = function (tela, iniciar) {
    var entrada = document.getElementById('ct-entrada-leitor');
    var link = entrada.querySelector('a');
    var url = new URL(link.getAttribute('href'), location.href);
    var busca = new URLSearchParams(location.search).get('q');
    if (busca) url.searchParams.set('q', busca.slice(0, 250));
    link.href = url.href;
    if (window.parent === window) { location.replace(link.href); return; }

    // file:// pode ocultar o pai: nesse caso só o link para a plataforma fica disponível.
    var host = window.parent;
    try {
      var diretorio = new URL('.', url);
      var atual = new URL(host.location.href);
      var quadro = window.frameElement;
      if (atual.origin !== url.origin || atual.protocol !== url.protocol ||
          (atual.pathname !== url.pathname && atual.pathname !== diretorio.pathname) ||
          !quadro || quadro.contentWindow !== window || quadro.ownerDocument !== host.document ||
          quadro.getAttribute('data-ct-view') !== tela ||
          new URL(quadro.getAttribute('data-ct-frame'), atual).pathname !== location.pathname) return;
    } catch (_) { return; }

    var titular = '', invalidado = false;
    function conta() {
      try {
        var id = !invalidado && host.CatedraAuth && host.CatedraAuth.contaLeitor;
        return typeof id === 'string' ? id : '';
      } catch (_) { return ''; }
    }
    function conferir() {
      if (invalidado) return;
      var id = conta();
      if (titular && id !== titular) {
        invalidado = true;
        document.body.replaceChildren(entrada);
        entrada.hidden = false;
        location.replace(location.href);
      } else if (!titular && id) {
        titular = id;
        // O auth do host conhece o dono da página, intercepta as gravações e sincroniza.
        // Um callback atrasado de um leitor anterior perde também o acesso ao armazenamento.
        function continuaTitular() {
          if (conta() === titular) return true;
          if (!invalidado) conferir();
          return false;
        }
        iniciar({
          getItem: function (k) { return conta() === titular ? host.localStorage.getItem(k) : null; },
          setItem: function (k, v) { if (conta() === titular) host.localStorage.setItem(k, v); },
          removeItem: function (k) { if (conta() === titular) host.localStorage.removeItem(k); }
        }, continuaTitular);
      }
    }
    function observar() { host.addEventListener('catedra:sessaoleitor', conferir); conferir(); }
    link.addEventListener('click', function (e) {
      if (!conta() && host.CatedraAuth && typeof host.CatedraAuth.solicitarLoginLeitor === 'function') {
        e.preventDefault();
        host.CatedraAuth.solicitarLoginLeitor();
      }
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) conferir();
    });
    window.addEventListener('pagehide', function () {
      host.removeEventListener('catedra:sessaoleitor', conferir);
      document.documentElement.style.visibility = 'hidden';
    });
    window.addEventListener('pageshow', function () {
      observar();
      if (!invalidado) document.documentElement.style.visibility = '';
    });
    observar();
  };

  window.ctMontarLeitor = async function (armazenamento, continuaTitular) {
    var molde = document.getElementById('ct-conteudo-leitor');
    var entrada = document.getElementById('ct-entrada-leitor');
    var fontes = Array.from(molde.content.querySelectorAll('script'));
    var logica = fontes.pop();
    window.ctArmazenamentoLeitor = armazenamento;
    try {
      // A ordem dos scripts clássicos importa (o JURIS consulta o índice ao iniciar).
      await Promise.all(fontes.map(function (fonte) {
        return new Promise(function (resolve, reject) {
          var script = document.createElement('script');
          script.async = false;
          script.onload = resolve;
          script.onerror = reject;
          script.src = fonte.getAttribute('src');
          fonte.remove();
          document.head.appendChild(script);
        });
      }));
      if (!molde.isConnected || !continuaTitular()) return;
      logica.remove();
      molde.replaceWith(molde.content);
      var script = document.createElement('script');
      script.textContent = logica.textContent;
      document.body.appendChild(script);
      entrada.hidden = true;
    } catch (_) {
      entrada.firstElementChild.textContent = 'Não foi possível carregar o leitor.';
      entrada.querySelector('a').textContent = 'Abrir novamente no Cátedra';
    }
  };
})();
