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
  var VERSION = 'catedra-v2';
  var ASSETS = ['./', './support.js', './manifest.webmanifest', './icon.svg'];

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
        .then(function(keys){ return Promise.all(keys.filter(function(k){ return k !== VERSION; }).map(function(k){ return caches.delete(k); })); })
        .then(function(){ return self.clients.claim(); })
    );
  });

  // network-first: online sempre serve a versão fresca (deploys aparecem na hora);
  // o cache é só fallback offline. Evita servir build antigo após uma atualização.
  self.addEventListener('fetch', function(e){
    var url = new URL(e.request.url);
    if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; // React/CDN/fontes seguem direto
    e.respondWith(
      fetch(e.request).then(function(res){
        if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function(c){ c.put(e.request, copy); }); }
        return res;
      }).catch(function(){ return caches.match(e.request); })
    );
  });
}
