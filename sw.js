/* Cátedra — service worker (PWA, roadmap 2.2)

   PRODUÇÃO (HTTPS, domínio real): cache-first com atualização em segundo plano
   (stale-while-revalidate) — app instalável e offline.

   DEV / PREVIEW (localhost, http, file://): o SW NÃO deve operar. Ele intercepta
   o reparse de template do dc-runtime (fetch(location.href) em support.js) e
   serve assets antigos, quebrando o preview. Por isso, fora de produção este
   worker se AUTODESTRÓI: limpa o cache, se desregistra e recarrega as abas — de
   modo que qualquer preview "preso" num SW antigo se recupera sozinho na próxima
   navegação (o navegador rebusca o sw.js e instala esta versão). */

var HOST = self.location.hostname;
var IS_PROD = (self.location.protocol === 'https:') && HOST !== 'localhost' && HOST !== '127.0.0.1' && HOST !== '';

if (!IS_PROD) {
  // ---- fora de produção: kill-switch (sem handler de fetch = pass-through total) ----
  self.addEventListener('install', function(){ self.skipWaiting(); });
  self.addEventListener('activate', function(e){
    e.waitUntil(
      caches.keys()
        .then(function(keys){ return Promise.all(keys.map(function(k){ return caches.delete(k); })); })
        .then(function(){ return self.clients.claim().catch(function(){}); })
        .then(function(){ return self.registration.unregister().catch(function(){}); })
        .then(function(){ return self.clients.matchAll({ type: 'window' }); })
        .then(function(cs){ cs.forEach(function(c){ try { Promise.resolve(c.navigate(c.url)).catch(function(){}); } catch (_) {} }); })
        .catch(function(){})
    );
  });
} else {
  // ---- produção: PWA normal ----
  var VERSION = 'catedra-v4';
  // Os blocos de dados/ (ver scripts/build-fatias.mjs) trazem o hash do conteúdo no
  // nome: são IMUTÁVEIS. Ficam num cache próprio, que não é apagado a cada deploy —
  // senão o app rebaixaria dezenas de megabytes de acervo a cada publicação. Quando
  // o conteúdo muda, o nome muda, e o bloco velho é lixo inerte: o ct-dados.js
  // descarta o registro no IndexedDB e este cache é limpo sob demanda pela mensagem
  // ctPurgarDados (CTDados.limpar()).
  var CACHE_DADOS = 'catedra-dados-v1';
  var EH_DADO = /\/dados\/[^/]+\/[^/]+\.json$/;
  // './' e './index.html' são chaves de cache DIFERENTES: o PWA instalado abre em
  // ./index.html (start_url), então sem ele na lista o app abria em branco offline.
  var ASSETS = ['./', './index.html', './support.js', './auth.js', './ct-dados.js', './manifest.webmanifest', './icon.svg'];
  /*__EXTRA_ASSETS__*/
  var docFresco = null; // resposta da última navegação, para o refetch do boot

  self.addEventListener('install', function(e){
    e.waitUntil(
      caches.open(VERSION)
        .then(function(c){ return Promise.all(ASSETS.map(function(a){ return c.add(a).catch(function(){}); })); })
        .then(function(){ return self.skipWaiting(); })
    );
  });

  self.addEventListener('activate', function(e){
    e.waitUntil(
      caches.keys()
        .then(function(keys){ return Promise.all(keys.filter(function(k){ return k !== VERSION && k !== CACHE_DADOS; }).map(function(k){ return caches.delete(k); })); })
        .then(function(){ return self.clients.claim(); })
    );
  });

  // network-first: online sempre serve a versão fresca (deploys aparecem na hora);
  // o cache é só fallback offline. Evita servir build antigo após uma atualização.
  self.addEventListener('fetch', function(e){
    var url = new URL(e.request.url);
    if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; // fontes/CDN seguem direto
    var ehDoc = (url.pathname === '/' || /\/index\.html$/.test(url.pathname));

    // Bloco de acervo: cache-first puro. O manifesto NÃO entra aqui — ele precisa ser
    // sempre fresco, porque é ele que anuncia quais blocos existem nesta versão.
    if (EH_DADO.test(url.pathname) && !/manifesto\.json$/.test(url.pathname)) {
      e.respondWith(
        caches.open(CACHE_DADOS).then(function (c) {
          return c.match(e.request).then(function (hit) {
            if (hit) return hit;
            return fetch(e.request).then(function (res) {
              if (res && res.ok) c.put(e.request, res.clone());
              return res;
            });
          });
        })
      );
      return;
    }

    // O dc-runtime rebusca o PRÓPRIO documento logo depois do boot, só para reler o
    // template cru: ~1 MB baixado de novo em toda abertura. Aqui devolvemos a cópia
    // EXATA que acabou de ser servida na navegação — mesmo build, sem rede. (Ler do
    // cache não serviria: o c.put é assíncrono e o refetch pode chegar antes dele,
    // pegando o deploy anterior — que é justamente o que o network-first evita.)
    if (ehDoc && e.request.mode !== 'navigate' && docFresco) {
      e.respondWith(Promise.resolve(docFresco.clone()));
      return;
    }
    e.respondWith(
      fetch(e.request).then(function(res){
        if (res && res.ok) {
          var copy = res.clone(); caches.open(VERSION).then(function(c){ c.put(e.request, copy); });
          if (ehDoc && e.request.mode === 'navigate') docFresco = res.clone();
        }
        return res;
      }).catch(function(){
        return caches.match(e.request).then(function(hit){
          if (hit) return hit;
          // offline numa rota qualquer (?view=…, /algo): devolve o app inteiro,
          // que resolve a tela sozinho — melhor que o dinossauro do navegador.
          if (e.request.mode === 'navigate') return caches.match('./index.html').then(function(doc){ return doc || caches.match('./'); });
          return hit;
        });
      })
    );
  });

  // CTDados.limpar() pede a limpeza do acervo guardado neste aparelho.
  self.addEventListener('message', function(e){
    var d = (e && e.data) || {};
    if (d.type !== 'ctPurgarDados') return;
    e.waitUntil(caches.delete(CACHE_DADOS).catch(function(){}));
  });

  // clique numa notificação: foca a aba do app (ou abre uma nova)
  self.addEventListener('notificationclick', function(e){
    e.notification.close();
    e.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(cs){
        for (var i = 0; i < cs.length; i++) { if ('focus' in cs[i]) return cs[i].focus(); }
        if (self.clients.openWindow) return self.clients.openWindow('./');
      })
    );
  });

  // push real (com app fechado) — requer servidor com chaves VAPID enviando o payload
  self.addEventListener('push', function(e){
    var d = {};
    try { d = e.data ? e.data.json() : {}; } catch (_) {}
    e.waitUntil(self.registration.showNotification(d.titulo || 'Cátedra', {
      body: d.texto || '', icon: './icon-180.png', badge: './icon.svg', tag: d.id || 'catedra', data: d
    }));
  });
}
