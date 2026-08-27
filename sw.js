/* Cátedra — service worker (PWA, roadmap 2.2 · U10)

   PRODUÇÃO (HTTPS, domínio real): network-first com cache de fallback — app
   instalável e offline.

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
  var VERSION = 'catedra-v5';
  // Os blocos de dados/ (ver scripts/build-fatias.mjs) trazem o hash do conteúdo no
  // nome: são IMUTÁVEIS. Ficam num cache próprio, que não é apagado a cada deploy —
  // senão o app rebaixaria dezenas de megabytes de acervo a cada publicação. Quando
  // o conteúdo muda, o nome muda, e o bloco velho é lixo inerte: o ct-dados.js
  // descarta o registro no IndexedDB e este cache é limpo sob demanda pela mensagem
  // ctPurgarDados (CTDados.limpar()).
  var CACHE_DADOS = 'catedra-dados-v1';
  var EH_DADO = /\/dados\/[^/]+\/[^/]+\.json$/;
  // O manifesto é a única coisa em dados/ que NÃO pode ser cache-first: é ele que
  // anuncia quais blocos existem nesta versão.
  var EH_MANIFESTO = /\/dados\/[^/]+\/manifesto\.json$/;

  /* ─────────────────────── camada 1: a casca (precache bloqueante) ───────────────────────
     Só o que a pessoa precisa para o app ABRIR. Fica pequeno de propósito: o
     install segura a instalação do worker, e um install de dezenas de MB no
     4G falha inteiro (o c.add é tudo-ou-nada por arquivo) ou nunca termina.
     './' e './index.html' são chaves de cache DIFERENTES: o PWA instalado abre em
     ./index.html (start_url), então sem ele na lista o app abria em branco offline. */
  var ASSETS = ['./', './index.html', './support.js', './auth.js', './ct-dados.js', './manifest.webmanifest', './icon.svg'];
  /*__EXTRA_ASSETS__*/

  /* ────────────────── camada 2: os acervos (aquecimento oportunista) ──────────────────
     [caminho, bytes] — os tamanhos vêm MEDIDOS do build (scripts/build.mjs), não
     chutados, para que o orçamento abaixo seja aritmética e não fé. Sem o build,
     a lista fica vazia e o SW se comporta como antes: cache do que passar pela rede.

     Por que uma segunda camada, e não tudo no install: são ~11 MB. Baixar isso
     antes de o worker ativar deixaria a primeira abertura do app refém do acervo
     inteiro. Aqui o download corre DEPOIS de ativar, item a item, e quem perder a
     rede no meio simplesmente retoma na próxima ativação.

     O QUE FICA DE FORA, e por quê (medido em 22/08/2026):
      · contas-index.js (2,5 MB) + dados/contas-text/ (8,7 MB) — a ARMADILHA da
        especificação. 11,2 MB para o SEGUNDO acervo do JURIS (TCU + 33 TCEs), que
        não é do edital de magistratura: é consulta eventual, não estudo diário.
        Sozinho ele DOBRARIA o precache (10,9 MB → 22,1 MB), e 22 MB é exatamente a
        faixa em que o Safari do iPhone começa a recusar/expulsar cache — precache
        que estoura a cota é pior que precache nenhum. Decisão: SÓ-ONLINE. Não fica
        desamparado: o MANIFESTO de contas está na casca (1,2 KB), e é ele que faz o
        CTDados continuar no caminho dos blocos offline em vez de desistir e pedir o
        monolito de 8,6 MB que não está lá — então verbete lido uma vez online segue
        abrindo em modo avião, pelo IndexedDB e pelo cache-first de dados/. O índice
        entra no cache na primeira visita online à aba Contas, pelo network-first.
      · leis-seca.js (4,2 MB, monolito) — o mesmo texto já entra pelos blocos de
        dados/leis-seca/ abaixo; cachear os dois seria pagar 8,4 MB pela mesma lei.
      · discursivas-textos.js — desde 21/08 a Redação o carrega sob demanda ao abrir
        uma prova; por isso ele entrou no acervo SOB PEDIDO do "Baixar tudo" (a lista
        __ACERVOS__ abaixo, montada pelo build), e não no precache da primeira visita.
      · dados/juris-text/ (9,7 MB em blocos) — o texto de cada verbete é cache-first
        sob demanda, que é exatamente para o que ele foi fatiado. */
  var ACERVOS = [];
  /*__ACERVOS__*/

  /* ─────────── camada 3: os pesados, só quando ELA pedir ("Baixar tudo") ───────────
     Três arquivos que valem 17,8 MB e desbloqueiam uma tela inteira cada um. Baixar
     isso sozinho, sem ela pedir, é que seria estourar a cota do aparelho:
      · juris-text.js (9,6 MB) — o Simulado de jurisprudência monta os itens com
        __JURIS_TXT__ INTEIRO (treino.js: verbetes()), então aqui não há meio-termo:
        ou o arquivo está guardado, ou o simulado de súmulas não abre offline.
      · oral-conteudo.js (4,9 MB) — as 999 perguntas de banca da arguição oral.
      · leis-seca-areas.js (3,3 MB) — as 35 leis das áreas não jurídicas; o worker
        não tem como saber qual área ela escolheu.
     O host chama window.__catedraOffline.baixar() e o worker traz estes junto. */
  var ACERVOS_SOB_PEDIDO = [];
  /*__ACERVOS_SOB_PEDIDO__*/

  // Teto do aquecimento. Hoje a lista soma ~11 MB e cabe inteira; o teto existe
  // para o dia em que alguém acrescentar um acervo grande sem medir — aí a cauda
  // da lista é cortada em silêncio, em vez de o cache do app estourar a cota.
  var ORCAMENTO_ACERVO = 14 * 1024 * 1024;
  // Quando é ela quem manda baixar, o teto sobe para caber a camada 3 — mas a
  // trava da cota (abaixo) continua valendo: pedido dela não cria espaço no aparelho.
  var ORCAMENTO_PEDIDO = 42 * 1024 * 1024;
  // Nunca ocupar mais que 1/FOLGA_COTA do espaço livre que o navegador declara:
  // encher a cota faz o navegador despejar TUDO, inclusive a casca.
  var FOLGA_COTA = 2.5;

  /* ───────────────────────── decisões (funções puras, testáveis) ───────────────────────── */

  /** Bloco de acervo fatiado (cache-first puro) — o manifesto não conta. */
  function ehBlocoDeDados(caminho) {
    return EH_DADO.test(caminho) && !EH_MANIFESTO.test(caminho);
  }

  /** O que cabe no orçamento, na ordem de prioridade da lista. Item grande demais
      é PULADO (e não interrompe a fila): um acervo de 5 MB no meio não pode
      condenar os quatro de 100 KB que vêm depois dele. */
  function planoDeAquecimento(lista, orcamento) {
    var itens = [], bytes = 0, cortados = [];
    for (var i = 0; i < lista.length; i++) {
      var b = lista[i][1] || 0;
      if (bytes + b > orcamento) { cortados.push(lista[i][0]); continue; }
      itens.push(lista[i]); bytes += b;
    }
    return { itens: itens, bytes: bytes, cortados: cortados };
  }

  /** Que cara tem o fallback quando não há rede NEM cópia guardada.
      O caso que doía: um satélite (LEGIS/JURIS/roteiros) é uma navegação DENTRO de
      um iframe. Devolver o index.html ali plantava o app inteiro dentro do app. */
  function modoDeFallback(req) {
    var destino = (req && req.destination) || '';
    var modo = (req && req.mode) || '';
    var caminho = '';
    try { caminho = new URL(req.url, self.location.href).pathname; } catch (_) { caminho = String((req && req.url) || ''); }
    var ehEntrada = caminho === '/' || /\/(index|Catedra\.dc)\.html$/.test(caminho);
    if (destino === 'iframe' || destino === 'frame') return 'pagina';
    // Safari antigo não preenche `destination`: aqui, toda navegação para um
    // *-web.html é um satélite dentro de iframe. Sem esta linha, ela cairia no
    // ramo 'app' e o iframe abriria o Cátedra inteiro dentro do Cátedra.
    if (modo === 'navigate' && /\.html$/.test(caminho) && !ehEntrada) return 'pagina';
    if (modo === 'navigate' || destino === 'document') return 'app';
    return 'recurso';
  }

  /* ───────────────────────────── página de indisponível ─────────────────────────────
     Antes, o que não estava em cache morria em erro de rede cru: tela branca no
     iframe e o dinossauro do navegador na navegação. Esta página é gerada aqui
     mesmo (nada de offline.html) para não existir um arquivo a mais para copiar,
     versionar e esquecer de atualizar em três builds diferentes. */
  function paginaOffline(titulo, texto) {
    var html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>' + titulo + ' · Cátedra</title><style>'
      + ':root{color-scheme:dark light;--bg:#0d1117;--surface:#161b22;--ink:#e6edf3;--dim:#8b949e;--accent:#0f7a57;--border:#30363d}'
      + '@media (prefers-color-scheme:light){:root{--bg:#f6f8fa;--surface:#fff;--ink:#1f2328;--dim:#59636e;--border:#d1d9e0}}'
      + '*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;'
      + 'padding:24px;background:var(--bg);color:var(--ink);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Inter",system-ui,sans-serif}'
      + '.cx{max-width:32rem;width:100%;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:22px 24px}'
      + 'h1{margin:0 0 8px;font-size:18px;letter-spacing:-.01em}p{margin:0 0 14px;color:var(--dim)}'
      + 'button{font:inherit;font-weight:600;color:#fff;background:var(--accent);border:0;border-radius:9px;padding:9px 16px;cursor:pointer}'
      + '</style></head><body><div class="cx"><h1>' + titulo + '</h1><p>' + texto + '</p>'
      + '<button onclick="location.reload()">Tentar de novo</button></div></body></html>';
    return new Response(html, {
      // 200, e não 503: esta resposta É a tela final que a pessoa vê, não um erro
      // que alguém mais vá tratar — e um 503 em iframe fica à mercê do navegador.
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }

  /** Sub-recurso (script, JSON, imagem) sem rede e sem cópia. Precisa FALHAR:
      devolver um .js vazio com 200 faria o app achar que o acervo carregou e
      quebrar mais adiante, longe da causa. 503 dispara o onerror de quem pediu,
      que já tem mensagem própria ("não consegui carregar oral-conteudo.js"). */
  function recursoOffline(req) {
    var url = (req && req.url) || '';
    var json = /\.json(\?|$)/.test(url);
    return new Response(
      json ? '{"offline":true}' : '/* Cátedra: sem rede e sem cópia guardada deste arquivo. */',
      { status: 503, statusText: 'Offline',
        headers: { 'Content-Type': (json ? 'application/json' : 'text/plain') + '; charset=utf-8', 'Cache-Control': 'no-store' } }
    );
  }

  function respostaOffline(req) {
    var modo = modoDeFallback(req);
    if (modo === 'app') {
      // offline numa rota qualquer (?view=…, /algo): devolve o app inteiro, que
      // resolve a tela sozinho — melhor que o dinossauro do navegador.
      return caches.match('./index.html')
        .then(function (doc) { return doc || caches.match('./'); })
        .then(function (doc) {
          return doc || paginaOffline('Cátedra offline',
            'O app ainda não foi guardado neste aparelho. Abra uma vez com internet e ele passa a funcionar em modo avião.');
        });
    }
    if (modo === 'pagina') {
      return Promise.resolve(paginaOffline('Esta tela ainda não está offline',
        'Ela não foi baixada para este aparelho. Com internet, basta abri-la uma vez — depois ela funciona em modo avião.'));
    }
    return Promise.resolve(recursoOffline(req));
  }

  /* ─────────────────────────────── aquecimento do acervo ─────────────────────────────── */

  /** Quanto dá para gastar sem chegar perto do teto do navegador. */
  function orcamentoDisponivel(forcado) {
    var teto = forcado ? ORCAMENTO_PEDIDO : ORCAMENTO_ACERVO;
    try {
      if (self.navigator && self.navigator.storage && self.navigator.storage.estimate) {
        return self.navigator.storage.estimate().then(function (e) {
          if (!e || !e.quota) return teto;               // sem estimativa: confia no teto
          var livre = Math.max(0, (e.quota || 0) - (e.usage || 0));
          return Math.max(0, Math.min(teto, Math.floor(livre / FOLGA_COTA)));
        }).catch(function () { return teto; });
      }
    } catch (_) {}
    return Promise.resolve(teto);
  }

  var aquecendo = null, aquecendoForcado = false;
  function aquecerAcervos(forcado) {
    if (aquecendo) {
      // "Baixar tudo" chegando enquanto o aquecimento automático corre: NÃO pode
      // devolver a promessa dele, senão o botão dos Ajustes diria "pronto" sem ter
      // trazido nenhum dos pesados. Espera a fila atual acabar e recomeça pedindo.
      if (!forcado || aquecendoForcado) return aquecendo;
      return aquecendo.catch(function () {}).then(function () { return aquecerAcervos(true); });
    }
    var lista = forcado ? ACERVOS.concat(ACERVOS_SOB_PEDIDO) : ACERVOS;
    if (!lista.length) return Promise.resolve({ baixados: 0, jaTinha: 0, falhas: 0, cortados: 0, total: 0 });
    // "Economizar dados" ligado é um pedido explícito: 11 MB de acervo no plano de
    // dados dela sem ela pedir seria grosseria. Com o botão dos Ajustes (forcado),
    // vai assim mesmo — aí foi ela quem mandou.
    if (!forcado) {
      try { if (self.navigator && self.navigator.connection && self.navigator.connection.saveData) return Promise.resolve({ pulado: 'saveData' }); } catch (_) {}
    }
    aquecendoForcado = !!forcado;
    aquecendo = orcamentoDisponivel(forcado).then(function (orc) {
      var plano = planoDeAquecimento(lista, orc);
      var res = { baixados: 0, jaTinha: 0, falhas: 0, cortados: plano.cortados.length, total: plano.itens.length };
      return Promise.all([caches.open(VERSION), caches.open(CACHE_DADOS)]).then(function (cs) {
        var cCasca = cs[0], cDados = cs[1];
        // Em fila, e não em paralelo: 25 downloads simultâneos num 4G derrubam uns
        // aos outros e ainda competem com a tela que a pessoa está usando agora.
        return plano.itens.reduce(function (p, item) {
          return p.then(function () {
            var caminho = item[0];
            var c = ehBlocoDeDados(caminho) ? cDados : cCasca;
            return c.match(caminho).then(function (hit) {
              if (hit) { res.jaTinha++; return; }
              return fetch(caminho).then(function (r) {
                if (!r || !r.ok) { res.falhas++; return; }
                return c.put(caminho, r).then(function () { res.baixados++; });
              }).catch(function () { res.falhas++; });   // rede caiu: o resto fica para a próxima ativação
            }).catch(function () { res.falhas++; });
          });
        }, Promise.resolve()).then(function () { return res; });
      });
    }).then(function (r) { aquecendo = null; aquecendoForcado = false; return r; },
            function (e) { aquecendo = null; aquecendoForcado = false; throw e; });
    return aquecendo;
  }

  /* Uma tentativa por VIDA do worker. O navegador do celular mata service worker
     ocioso sem avisar: se o aquecimento do activate morrer no meio, sem isto o
     acervo ficaria pela metade até o próximo deploy. Assim, a próxima vez que ela
     abrir o app o worker novo retoma de onde parou (o que já está em cache é pulado). */
  var jaAqueceu = false;
  function talvezAquecer() {
    if (jaAqueceu) return;
    jaAqueceu = true;
    try { aquecerAcervos().catch(function () {}); } catch (_) {}
  }

  /** Quanto do acervo já está neste aparelho — é o que os Ajustes mostram.
      Separa o que o worker traz sozinho (auto) do total com os pesados, para o
      texto do Ajuste poder dizer "o dia a dia está pronto; faltam os 18 MB do
      simulado de súmulas" em vez de uma barra eternamente incompleta. */
  function estadoOffline() {
    var lista = ACERVOS.concat(ACERVOS_SOB_PEDIDO);
    return Promise.all([caches.open(VERSION), caches.open(CACHE_DADOS)]).then(function (cs) {
      var cCasca = cs[0], cDados = cs[1];
      return Promise.all(lista.map(function (item) {
        var c = ehBlocoDeDados(item[0]) ? cDados : cCasca;
        return c.match(item[0]).then(function (h) { return h ? (item[1] || 0) : 0; }).catch(function () { return 0; });
      })).then(function (bytesPorItem) {
        var r = { prontos: 0, total: lista.length, bytes: 0, totalBytes: 0, versao: VERSION,
                  auto: { prontos: 0, total: ACERVOS.length, bytes: 0, totalBytes: 0 } };
        for (var i = 0; i < lista.length; i++) {
          var tam = lista[i][1] || 0, temCopia = bytesPorItem[i] > 0;
          r.totalBytes += tam;
          if (temCopia) { r.prontos++; r.bytes += tam; }
          if (i < ACERVOS.length) {
            r.auto.totalBytes += tam;
            if (temCopia) { r.auto.prontos++; r.auto.bytes += tam; }
          }
        }
        return r;
      });
    });
  }

  /* ─────────────────────────────────── ciclo de vida ─────────────────────────────────── */

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
    // FORA do waitUntil de propósito: ~11 MB de acervo dentro dele segurariam a
    // ativação — e, com ela, o primeiro fetch da aba que está esperando na tela.
    // O acervo é rebaixado inteiro a cada deploy porque estes arquivos não têm hash
    // no nome: servir a cópia anterior seria exatamente o bug que o network-first
    // existe para evitar.
    talvezAquecer();
  });

  // network-first: online sempre serve a versão fresca (deploys aparecem na hora);
  // o cache é só fallback offline. Evita servir build antigo após uma atualização.
  var docFresco = null; // resposta da última navegação, para o refetch do boot

  self.addEventListener('fetch', function(e){
    var url = new URL(e.request.url);
    if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; // fontes/CDN seguem direto
    var ehDoc = (url.pathname === '/' || /\/index\.html$/.test(url.pathname));
    if (e.request.mode === 'navigate') talvezAquecer();   // retoma o acervo depois de o worker ter sido morto

    // Bloco de acervo: cache-first puro. O manifesto NÃO entra aqui — ele precisa ser
    // sempre fresco, porque é ele que anuncia quais blocos existem nesta versão.
    if (ehBlocoDeDados(url.pathname)) {
      e.respondWith(
        caches.open(CACHE_DADOS).then(function (c) {
          return c.match(e.request).then(function (hit) {
            if (hit) return hit;
            return fetch(e.request).then(function (res) {
              if (res && res.ok) c.put(e.request, res.clone());
              return res;
            }).catch(function () { return recursoOffline(e.request); });
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
          return hit || respostaOffline(e.request);
        });
      })
    );
  });

  self.addEventListener('message', function(e){
    var d = (e && e.data) || {};
    // CTDados.limpar() pede a limpeza do acervo guardado neste aparelho.
    if (d.type === 'ctPurgarDados') { e.waitUntil(caches.delete(CACHE_DADOS).catch(function(){})); return; }

    // O host (Ajustes → "Instalar no aparelho") pergunta e manda baixar. Responde
    // pela porta do MessageChannel quando houver, senão avisa todas as abas.
    function responder(msg) {
      try { if (e.ports && e.ports[0]) { e.ports[0].postMessage(msg); return; } } catch (_) {}
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(function (cs) { cs.forEach(function (c) { try { c.postMessage(msg); } catch (_) {} }); })
        .catch(function () {});
    }
    if (d.type === 'ctEstadoOffline') {
      e.waitUntil(estadoOffline().then(function (r) { responder({ type: 'ctEstadoOffline', ok: true, estado: r }); })
        .catch(function () { responder({ type: 'ctEstadoOffline', ok: false }); }));
      return;
    }
    if (d.type === 'ctAquecerAcervos') {
      e.waitUntil(aquecerAcervos(true).then(function (r) { responder({ type: 'ctAquecerAcervos', ok: true, resultado: r }); })
        .catch(function () { responder({ type: 'ctAquecerAcervos', ok: false }); }));
      return;
    }
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

  /* Superfície de teste. Os testes rodam em localhost, onde este worker se
     autodestrói de propósito — então a única forma de conferir o caminho de
     PRODUÇÃO é chamar as decisões diretamente, com um `self` simulado. */
  self.__ctSW = {
    VERSION: VERSION, CACHE_DADOS: CACHE_DADOS, ASSETS: ASSETS, ACERVOS: ACERVOS,
    ACERVOS_SOB_PEDIDO: ACERVOS_SOB_PEDIDO,
    ORCAMENTO_ACERVO: ORCAMENTO_ACERVO, ORCAMENTO_PEDIDO: ORCAMENTO_PEDIDO, FOLGA_COTA: FOLGA_COTA,
    ehBlocoDeDados: ehBlocoDeDados, planoDeAquecimento: planoDeAquecimento,
    modoDeFallback: modoDeFallback, paginaOffline: paginaOffline,
    recursoOffline: recursoOffline, orcamentoDisponivel: orcamentoDisponivel
  };
}
