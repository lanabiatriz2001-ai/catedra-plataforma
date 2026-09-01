/* ==========================================================================
   mapa-processual.js — a CAMADA VISUAL do mapa.

   Recebe o grafo pronto do mapa-grafo.js e desenha o rito como MAPA: tronco da
   esquerda para a direita, decisões abrindo caminhos acima e abaixo, setas com
   o rótulo da bifurcação e reconvergência ao tronco. Arrastar, ampliar,
   enquadrar, minimapa, busca, filtros, escolha de caminho, favoritos, notas,
   rascunho e navegação por teclado moram aqui.

   Não conhece rito nenhum: tudo o que sabe de direito chega pelo grafo e pelo
   acervo de peças. Cadastrar um rito novo é mexer só em fluxos.js.

   Expõe: window.CTMapa.montar(elemento, opcoes) → { abrir, ir, destruir }
     opcoes.grafo        grafo do CTMapaGrafo
     opcoes.pecas        window.CT_PECAS
     opcoes.aoAcervo     (alvo, termo, de) → leva ao LEGIS/JURIS
     opcoes.aoRoteiro    (nome) → abre o roteiro completo da peça
   ========================================================================== */
(function () {
'use strict';

var CH = 'catedraMapaProcessual';          /* por aparelho, como o modo cego das peças */
function lerTudo(){ try { return JSON.parse(localStorage.getItem(CH)) || {}; } catch (e) { return {}; } }
function gravarTudo(o){ try { localStorage.setItem(CH, JSON.stringify(o)); } catch (e) {} }

function esc(s){ return String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function sa(t){ return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); }

var ROTULO = { inicio:'Início', ato:'Ato', decisao:'Decisão', prazo:'Prazo',
               recurso:'Recurso', fim:'Encerramento', rejeicao:'Rejeição' };
var FAIXA_PRAZO = { curto:'até 5 dias', medio:'de 6 a 15 dias', longo:'mais de 15 dias' };

/* ─────────────────────────────── estilo ───────────────────────────────
   Escopo fechado em .mp: a página do rito continua com a cara dela, e o mapa
   tem a sua — quadro escuro, que é como mapa se lê. As cores que CARREGAM
   SENTIDO (ciano = onde estou, verde = por onde passei, roxo = alternativa,
   vermelho = porta fechada, dourado = fundamento) são fixas de propósito: se
   trocassem com o tema, a legenda deixaria de valer. */
var CSS = ''
/* Os tokens do mapa moram numa LISTA de seletores, não só em .mp: o painel lateral e o
   véu são anexados ao <body> (precisam ficar acima de tudo, fora da moldura da página),
   e variável CSS não atravessa o DOM de lado — declarada só em .mp, o painel herdava a
   cor de texto da página clara e ficava tinta escura sobre fundo escuro, ilegível. */
+ '.mp,.mp-painel,.mp-velo{--mp-bg:#06181f;--mp-sup:#0d2932;--mp-sup2:#12333e;--mp-cartao:#1c1432;'
+ '--mp-cartao2:#241a3e;--mp-borda:#3a2b53;--mp-borda2:rgba(157,124,195,.26);'
+ '--mp-tinta:#f3effa;--mp-tinta2:#bcb0ce;--mp-tinta3:#968aa8;'
+ '--mp-ciano:#4cc7ef;--mp-verde:#54d8a6;--mp-roxo:#ac91ff;--mp-ouro:#e8c06b;--mp-vermelho:#f2705a}'
+ '.mp{display:flex;flex-direction:column;gap:10px;color:var(--mp-tinta);font-size:13px}'
+ '.mp *{box-sizing:border-box}'
+ '.mp [hidden]{display:none!important}'
+ '.mp button{font:inherit;font-family:inherit}'

/* barra de ferramentas */
+ '.mp-barra{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:9px 11px;'
+ 'background:var(--mp-sup);border:1px solid var(--mp-borda);border-radius:14px}'
+ '.mp-busca{position:relative;flex:1 1 230px;min-width:190px;display:flex;align-items:center}'
+ '.mp-busca input{width:100%;min-height:44px;padding:0 84px 0 13px;border:1px solid var(--mp-borda);'
+ 'border-radius:11px;background:var(--mp-bg);color:var(--mp-tinta);font-size:13px}'
+ '.mp-busca input::placeholder{color:var(--mp-tinta3)}'
+ '.mp-conta{position:absolute;right:10px;font-size:11px;color:var(--mp-tinta2);'
+ 'font-variant-numeric:tabular-nums;pointer-events:none}'
+ '.mp-bt{min-height:44px;min-width:44px;padding:0 12px;border:1px solid var(--mp-borda2);'
+ 'border-radius:10px;background:var(--mp-sup2);color:var(--mp-tinta2);cursor:pointer;'
+ 'font-size:12px;font-weight:650;display:inline-flex;align-items:center;justify-content:center;gap:6px}'
+ '.mp-bt:hover{border-color:var(--mp-ciano);color:var(--mp-tinta)}'
+ '.mp-bt[aria-pressed="true"]{background:var(--mp-ciano);border-color:var(--mp-ciano);color:#05202a}'
+ '.mp-grupo{display:flex;gap:6px;flex-wrap:wrap}'
+ '.mp-prog{display:flex;align-items:center;gap:9px;margin-left:auto;font-size:11px;color:var(--mp-tinta2);'
+ 'white-space:nowrap}'
+ '.mp-prog b{color:var(--mp-ciano);font-variant-numeric:tabular-nums}'
+ '.mp-prog .barra{width:104px;height:7px;border-radius:99px;background:var(--mp-bg);'
+ 'border:1px solid var(--mp-borda);overflow:hidden}'
+ '.mp-prog .barra i{display:block;height:100%;background:var(--mp-verde);border-radius:99px}'

/* painel de filtros, recolhível */
+ '.mp-ferr{padding:12px 13px;background:var(--mp-sup);border:1px solid var(--mp-borda);'
+ 'border-radius:14px;display:grid;gap:12px}'
+ '.mp-ferr fieldset{border:0;margin:0;padding:0;display:flex;flex-wrap:wrap;align-items:center;gap:7px}'
+ '.mp-ferr legend{float:left;width:100%;font-size:10px;font-weight:800;letter-spacing:.11em;'
+ 'text-transform:uppercase;color:var(--mp-tinta3);margin-bottom:7px}'
+ '.mp-chip{min-height:36px;padding:0 12px;border:1px solid var(--mp-borda2);border-radius:99px;'
+ 'background:transparent;color:var(--mp-tinta2);cursor:pointer;font-size:12px}'
+ '.mp-chip[aria-pressed="true"]{background:var(--mp-roxo);border-color:var(--mp-roxo);color:#160f26;font-weight:700}'
+ '.mp-ferr .mp-limpa{margin-left:auto}'

/* o palco */
+ '.mp-palco{position:relative;min-height:340px;height:clamp(340px,58vh,760px);overflow:hidden;'
+ 'border:1px solid var(--mp-borda);border-radius:16px;background-color:var(--mp-bg);'
+ 'background-image:radial-gradient(circle,rgba(157,124,195,.20) 1px,transparent 1.2px);'
+ 'background-size:26px 26px;cursor:grab;touch-action:none;'
+ 'box-shadow:inset 0 0 90px rgba(0,0,0,.45)}'
+ '.mp-palco.arrastando{cursor:grabbing}'
+ '.mp-palco:focus-visible{outline:3px solid var(--mp-ciano);outline-offset:-3px}'
+ '.mp-mundo{position:absolute;top:0;left:0;transform-origin:0 0;will-change:transform}'
+ '.mp-linhas{position:absolute;top:0;left:0;overflow:visible;pointer-events:none}'
+ '.mp-linhas path{fill:none;stroke-width:2;vector-effect:non-scaling-stroke}'
+ '.mp-l-principal path{stroke:var(--mp-ciano)}'
+ '.mp-l-retorno path{stroke:var(--mp-ciano);stroke-dasharray:1 7;stroke-linecap:round}'
+ '.mp-l-alternativa path{stroke:var(--mp-roxo);stroke-dasharray:8 6}'
+ '.mp-l-rejeicao path{stroke:var(--mp-vermelho);stroke-dasharray:8 6}'
+ '.mp-linhas g.trilha path{stroke:var(--mp-verde);stroke-width:3.4;stroke-dasharray:none}'
+ '.mp-linhas g.apagada{opacity:.17}'
+ '.mp-linhas text{fill:var(--mp-tinta2);font:800 11px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;'
+ 'letter-spacing:.07em;text-transform:uppercase;paint-order:stroke;stroke:#06181f;stroke-width:6px}'
+ '.mp-linhas g.trilha text{fill:var(--mp-verde)}'

/* cartão */
+ '.mp-no{position:absolute;display:flex;flex-direction:column;border:1px solid var(--mp-borda);'
+ 'border-radius:15px;background:linear-gradient(160deg,var(--mp-cartao2),var(--mp-cartao));'
+ 'box-shadow:0 14px 34px rgba(0,0,0,.42);overflow:hidden}'
+ '.mp-no[data-tipo="decisao"]{border-color:rgba(232,192,107,.55)}'
+ '.mp-no[data-tipo="rejeicao"]{border-color:rgba(242,112,90,.62)}'
+ '.mp-no[data-tipo="fim"]{border-color:rgba(84,216,166,.5)}'
+ '.mp-no[data-tipo="recurso"]{border-color:rgba(172,145,255,.55)}'
+ '.mp-no.atual{border-color:var(--mp-ciano);box-shadow:0 0 0 3px rgba(76,199,239,.24),0 14px 34px rgba(0,0,0,.42)}'
+ '.mp-no.trilha{border-color:var(--mp-verde)}'
+ '.mp-no.atual.trilha{border-color:var(--mp-ciano)}'
+ '.mp-no.fora{opacity:.26}'
+ '.mp-no.apagada{opacity:.2}'
+ '.mp-no.achou{outline:3px solid var(--mp-ouro);outline-offset:4px}'
+ '.mp-abrir{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px;align-items:flex-start;'
+ 'padding:11px 13px 8px;border:0;background:transparent;color:inherit;cursor:pointer;text-align:left;width:100%}'
+ '.mp-abrir:focus-visible{outline:3px solid var(--mp-ciano);outline-offset:-3px}'
+ '.mp-topo{display:flex;align-items:center;gap:7px;width:100%;font-size:9.5px;font-weight:800;'
+ 'letter-spacing:.1em;text-transform:uppercase;color:var(--mp-roxo);padding-right:26px}'
+ '.mp-no[data-tipo="decisao"] .mp-topo{color:var(--mp-ouro)}'
+ '.mp-no[data-tipo="rejeicao"] .mp-topo{color:var(--mp-vermelho)}'
+ '.mp-no[data-tipo="fim"] .mp-topo{color:var(--mp-verde)}'
+ '.mp-topo .num{background:currentColor;color:var(--mp-cartao);border-radius:6px;padding:1px 5px;'
+ 'font-variant-numeric:tabular-nums}'
+ '.mp-topo .est{margin-left:auto;color:var(--mp-tinta3);letter-spacing:.06em;flex:none;white-space:nowrap}'
+ '.mp-topo>span:nth-child(2){overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}'
+ '.mp-no.trilha .mp-topo .est{color:var(--mp-verde)}'
+ '.mp-no.atual .mp-topo .est{color:var(--mp-ciano)}'
+ '.mp-abrir strong{font-size:13.5px;line-height:1.25;font-weight:750;display:-webkit-box;'
+ '-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}'
+ '.mp-abrir small{font-size:10.5px;line-height:1.4;color:var(--mp-tinta2);display:-webkit-box;'
+ '-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}'
+ '.mp-linha{display:flex;flex-wrap:wrap;gap:5px;align-items:center;font-size:10px;color:var(--mp-tinta2)}'
+ '.mp-prazo{border:1px solid rgba(76,199,239,.4);color:var(--mp-ciano);border-radius:99px;padding:1px 7px;font-weight:700}'
+ '.mp-ator{border:1px solid var(--mp-borda2);border-radius:99px;padding:1px 7px}'
+ '.mp-rod{display:flex;gap:5px;padding:0 10px 10px;flex-wrap:nowrap;overflow:hidden}'
+ '.mp-rod button{min-height:28px;padding:0 8px;border-radius:8px;cursor:pointer;font-size:9.5px;'
+ 'font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}'
+ '.mp-art{border:1px solid rgba(232,192,107,.5);background:rgba(232,192,107,.1);color:var(--mp-ouro);flex:1;min-width:0}'
+ '.mp-art:hover{border-color:var(--mp-ouro)}'
+ '.mp-pc{border:1px solid rgba(172,145,255,.55);background:rgba(172,145,255,.12);color:#e2d8ff;flex:none;max-width:52%}'
+ '.mp-pc:hover{border-color:var(--mp-roxo)}'
+ '.mp-ram{border:1px solid var(--mp-borda2);background:transparent;color:var(--mp-tinta2);flex:none}'
+ '.mp-fav{position:absolute;top:8px;right:8px;width:26px;height:26px;border-radius:8px;'
+ 'border:1px solid var(--mp-borda2);background:rgba(6,24,31,.6);color:var(--mp-tinta3);cursor:pointer;'
+ 'font-size:12px;line-height:1;display:grid;place-items:center;padding:0}'
+ '.mp-fav[aria-pressed="true"]{color:var(--mp-ouro);border-color:var(--mp-ouro)}'

/* controles flutuantes e minimapa */
+ '.mp-zoom{position:absolute;z-index:6;top:12px;left:12px;display:flex;gap:6px;padding:6px;'
+ 'background:rgba(9,32,40,.94);border:1px solid var(--mp-borda);border-radius:12px;flex-wrap:wrap;max-width:calc(100% - 24px)}'
+ '.mp-zoom .lupa{min-width:56px;display:grid;place-items:center;color:var(--mp-ciano);font-size:11px;'
+ 'font-weight:800;font-variant-numeric:tabular-nums}'
+ '.mp-mini{position:absolute;z-index:5;right:12px;bottom:12px;width:236px;height:126px;overflow:hidden;'
+ 'border:1px solid var(--mp-borda);border-radius:12px;background:rgba(9,32,40,.95);cursor:crosshair}'
+ '.mp-mini svg{display:block;width:100%;height:100%}'
+ '.mp-mini rect.n{fill:#2c1f44;stroke:var(--mp-roxo);stroke-width:1}'
+ '.mp-mini rect.n.trilha{fill:rgba(84,216,166,.45);stroke:var(--mp-verde)}'
+ '.mp-mini rect.n.atual{fill:rgba(76,199,239,.6);stroke:var(--mp-ciano)}'
+ '.mp-mini rect.vis{fill:rgba(76,199,239,.09);stroke:var(--mp-ciano);stroke-width:2}'
+ '.mp-legenda{position:absolute;z-index:4;left:12px;bottom:12px;display:flex;flex-wrap:wrap;gap:10px;'
+ 'padding:8px 11px;background:rgba(9,32,40,.9);border:1px solid var(--mp-borda);border-radius:11px;'
+ 'font-size:10px;color:var(--mp-tinta2);max-width:min(420px,calc(100% - 280px))}'
+ '.mp-legenda span{display:inline-flex;align-items:center;gap:6px}'
+ '.mp-legenda i{width:16px;height:3px;border-radius:99px;background:var(--mp-roxo)}'
+ '.mp-legenda i.atual{background:var(--mp-ciano)}.mp-legenda i.trilha{background:var(--mp-verde)}'
+ '.mp-legenda i.rej{background:var(--mp-vermelho)}.mp-legenda i.lei{background:var(--mp-ouro)}'

/* painel lateral */
+ '.mp-velo{position:fixed;inset:0;z-index:60;background:rgba(3,12,16,.62)}'
+ '.mp-painel{position:fixed;z-index:61;top:0;right:0;bottom:0;width:min(560px,96vw);display:flex;'
+ 'flex-direction:column;background:#0f1420;border-left:1px solid var(--mp-borda);'
+ 'box-shadow:-24px 0 60px rgba(0,0,0,.5);color:var(--mp-tinta);font-size:13px}'
+ '.mp-painel *{box-sizing:border-box}'
+ '.mp-painel button,.mp-painel textarea{font-family:inherit}'
+ '.mp-pcab{padding:17px 20px 14px;border-bottom:1px solid var(--mp-borda);background:#101a26}'
+ '.mp-pcab .kick{font-size:9.5px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:var(--mp-ciano)}'
+ '.mp-pcab .lin{display:flex;align-items:flex-start;gap:12px;margin-top:5px}'
+ '.mp-pcab h3{margin:0;flex:1;font-size:20px;line-height:1.22;font-weight:800}'
+ '.mp-x{flex:none;min-width:44px;min-height:44px;border:1px solid var(--mp-borda);border-radius:10px;'
+ 'background:var(--mp-sup2);color:var(--mp-tinta);cursor:pointer;font-size:15px}'
+ '.mp-pacs{display:flex;flex-wrap:wrap;gap:6px;padding:10px 20px;border-bottom:1px solid var(--mp-borda);background:#101a26}'
+ '.mp-pcorpo{flex:1;overflow:auto;padding:16px 20px 60px;display:grid;gap:11px;align-content:start}'
+ '.mp-sec{border:1px solid var(--mp-borda2);border-radius:12px;background:#141b2a;padding:13px 15px}'
+ '.mp-sec h4{margin:0 0 8px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mp-ouro)}'
+ '.mp-sec p{margin:0 0 7px;font-size:12.6px;line-height:1.62;color:var(--mp-tinta2)}'
+ '.mp-sec p:last-child{margin-bottom:0}'
+ '.mp-sec ol,.mp-sec ul{margin:0;padding-left:19px;font-size:12.4px;line-height:1.6;color:var(--mp-tinta2)}'
+ '.mp-sec li{margin-bottom:5px}'
+ '.mp-sec li b{color:var(--mp-tinta);font-weight:700}'
+ '.mp-sec .bl{border-top:1px dashed var(--mp-borda);padding-top:11px;margin-top:11px}'
+ '.mp-sec .bl:first-child{border-top:0;padding-top:0;margin-top:0}'
+ '.mp-sec .bl h5{margin:0 0 5px;font-size:13px;font-weight:750;color:var(--mp-tinta)}'
+ '.mp-refs{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}'
+ '.mp-refs button{min-height:34px;padding:0 11px;border-radius:9px;cursor:pointer;font-size:11.5px;text-align:left}'
+ '.mp-refs .lei{border:1px solid rgba(232,192,107,.45);background:rgba(232,192,107,.09);color:var(--mp-ouro)}'
+ '.mp-refs .jur{border:1px solid rgba(242,112,90,.42);background:rgba(242,112,90,.08);color:#ffb2a2}'
+ '.mp-escolhas{display:flex;flex-wrap:wrap;gap:7px}'
+ '.mp-escolhas button{min-height:44px;padding:0 14px;border-radius:10px;cursor:pointer;font-size:12.5px;'
+ 'border:1px solid var(--mp-roxo);background:rgba(172,145,255,.1);color:var(--mp-tinta)}'
+ '.mp-escolhas button[aria-pressed="true"]{background:var(--mp-verde);border-color:var(--mp-verde);'
+ 'color:#06231a;font-weight:750}'
+ '.mp-escolhas button.rej{border-color:var(--mp-vermelho);background:rgba(242,112,90,.1)}'
+ '.mp-escolhas button.rej[aria-pressed="true"]{background:var(--mp-vermelho);color:#280b06}'
+ '.mp-nota,.mp-rasc{width:100%;min-height:88px;border:1px solid var(--mp-borda);border-radius:10px;'
+ 'background:#0b111c;color:var(--mp-tinta);padding:10px 12px;font:inherit;font-size:12.6px;line-height:1.6;resize:vertical}'
+ '.mp-rasc{min-height:200px;font-family:ui-monospace,Menlo,monospace;font-size:12px}'
+ '.mp-modelo{white-space:pre-wrap;font-family:ui-monospace,Menlo,monospace;font-size:11.6px;line-height:1.62;'
+ 'color:var(--mp-tinta2);background:#0b111c;border:1px solid var(--mp-borda);border-radius:10px;padding:11px 13px;margin:0}'
+ '.mp-salvo{font-size:10.5px;color:var(--mp-verde)}'
+ '.mp-vazio{font-size:12.4px;color:var(--mp-tinta3);line-height:1.6}'

/* leitor de tela */
+ '.mp-so-leitor{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;'
+ 'clip:rect(0 0 0 0);white-space:nowrap;border:0}'

/* telas pequenas: o mapa CONTINUA horizontal — o que muda é a moldura */
+ '@media (max-width:760px){'
+ '.mp-mini{display:none}.mp-legenda{display:none}'
+ '.mp-palco{height:clamp(320px,64vh,560px)}'
+ '.mp-prog{margin-left:0;width:100%;order:9}'
+ '}';

/* ───────────────────────── caminho ortogonal ─────────────────────────
   O desvio vertical acontece SEMPRE no vão entre duas colunas, e o vão é maior
   que zero por construção da grade. É por isso que nenhuma linha atravessa
   cartão: não é ajuste de olho, é a geometria da grade. */
function caminho(sx, sy, tx, ty){
  if (Math.abs(ty - sy) < 1) return 'M ' + sx + ' ' + sy + ' L ' + tx + ' ' + ty;
  var mx = sx + (tx - sx) / 2, dir = ty > sy ? 1 : -1;
  var r = Math.min(15, Math.abs(tx - sx) / 2, Math.abs(ty - sy) / 2);
  return 'M ' + sx + ' ' + sy
    + ' L ' + (mx - r) + ' ' + sy + ' Q ' + mx + ' ' + sy + ' ' + mx + ' ' + (sy + dir * r)
    + ' L ' + mx + ' ' + (ty - dir * r) + ' Q ' + mx + ' ' + ty + ' ' + (mx + r) + ' ' + ty
    + ' L ' + tx + ' ' + ty;
}

/* ───────────────────────────── a instância ───────────────────────────── */
function montar(raiz, op){
  op = op || {};
  var G = op.grafo, PECAS = op.pecas || {}, CARTAO = window.CTMapaGrafo.CARTAO;
  if (!G || !G.nos.length) return null;

  /* -------- estado, com o que ficou guardado do rito -------- */
  var tudo = lerTudo(), guardado = tudo[G.rito] || {};
  var st = {
    ativo:     G.porId[guardado.ativo] ? guardado.ativo : G.tronco[0],
    escolhas:  guardado.escolhas || {},
    recolhidas:guardado.recolhidas || {},
    favoritos: guardado.favoritos || {},
    notas:     guardado.notas || {},
    rascunhos: guardado.rascunhos || {},
    vista:     guardado.vista || null,
    x: 0, y: 0, z: .72,
    arrastando: false, px: 0, py: 0, moveu: 0,
    busca: '', achados: [], iAchado: -1,
    filtros: { tipo: {}, prazo: '', peca: false, favorito: false, ator: '' },
    aberto: null
  };
  function guardar(){
    var t = lerTudo(), velho = t[G.rito] || {};
    t[G.rito] = { ativo: st.ativo, escolhas: st.escolhas, recolhidas: st.recolhidas,
                  favoritos: st.favoritos, notas: st.notas, rascunhos: st.rascunhos,
                  /* posição calculada com o palco ainda sem tamanho (iframe oculto no
                     app, aba fechada) é lixo: guardaria um enquadramento que ninguém
                     escolheu. Nesse caso conserva a última posição boa. */
                  vista: pronto() ? { x: st.x, y: st.y, z: st.z } : velho.vista };
    gravarTudo(t);
  }

  /* ------------------------------ esqueleto ------------------------------ */
  if (!document.getElementById('mp-css')) {
    var tag = document.createElement('style'); tag.id = 'mp-css'; tag.textContent = CSS;
    document.head.appendChild(tag);
  }
  raiz.className = 'mp';
  raiz.innerHTML = ''
  + '<div class="mp-barra">'
  +   '<label class="mp-busca"><span class="mp-so-leitor">Buscar etapa, peça, prazo ou artigo</span>'
  +     '<input type="search" data-r="busca" autocomplete="off" placeholder="buscar etapa, peça, prazo ou artigo…">'
  +     '<span class="mp-conta" data-r="conta" aria-hidden="true"></span></label>'
  +   '<div class="mp-grupo">'
  +     '<button class="mp-bt" type="button" data-r="ajustar" title="Enquadrar o rito inteiro (tecla 0)">⤢ Ajustar mapa</button>'
  +     '<button class="mp-bt" type="button" data-r="centrar" title="Centralizar a etapa atual (tecla C)">◎ Etapa atual</button>'
  +     '<button class="mp-bt" type="button" data-r="ferr" aria-pressed="false" aria-expanded="false" aria-controls="mp-ferr">⚙ Filtros</button>'
  +   '</div>'
  +   '<div class="mp-prog"><span id="mp-progRot">progresso</span>'
  +     '<span class="barra" data-r="pbar" role="progressbar" aria-labelledby="mp-progRot"'
  +       ' aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i data-r="barra"></i></span>'
  +     '<b data-r="pct">0%</b></div>'
  + '</div>'
  + '<div class="mp-ferr" id="mp-ferr" data-r="ferramentas" hidden>'
  +   '<fieldset data-r="fTipo"><legend>Tipo de ato</legend></fieldset>'
  +   '<fieldset data-r="fPrazo"><legend>Prazo</legend></fieldset>'
  +   '<fieldset data-r="fOutros"><legend>Peça, favorito e ramificações</legend></fieldset>'
  + '</div>'
  + '<div class="mp-palco" data-r="palco" tabindex="0" role="application"'
  +   ' aria-label="Mapa processual — arraste para mover, roda do mouse para ampliar, setas para navegar, Tab para percorrer as etapas">'
  +   '<div class="mp-zoom">'
  +     '<button class="mp-bt" type="button" data-r="mais" aria-label="Ampliar">＋</button>'
  +     '<button class="mp-bt" type="button" data-r="menos" aria-label="Reduzir">－</button>'
  +     '<span class="lupa" data-r="lupa" aria-hidden="true">72%</span>'
  +   '</div>'
  +   '<div class="mp-mundo" data-r="mundo">'
  +     '<svg class="mp-linhas" data-r="linhas" aria-hidden="true"></svg>'
  +     '<div data-r="nos"></div>'
  +   '</div>'
  +   '<div class="mp-legenda" aria-hidden="true">'
  +     '<span><i class="atual"></i>etapa atual</span><span><i class="trilha"></i>percorrido</span>'
  +     '<span><i></i>alternativa</span><span><i class="rej"></i>rejeição</span><span><i class="lei"></i>fundamento</span>'
  +   '</div>'
  +   '<div class="mp-mini" data-r="mini" role="img" aria-label="Visão geral do rito"></div>'
  + '</div>'
  + '<p class="mp-so-leitor" data-r="aviso" role="status" aria-live="polite"></p>';

  var q = function (n){ return raiz.querySelector('[data-r="' + n + '"]'); };
  var elPalco = q('palco'), elMundo = q('mundo'), elLinhas = q('linhas'), elNos = q('nos'),
      elMini = q('mini'), elLupa = q('lupa'), elBusca = q('busca'), elConta = q('conta'),
      elAviso = q('aviso'), elFerr = q('ferramentas');

  function avisar(t){ elAviso.textContent = t; }

  /* --------------------------- filtros da barra --------------------------- */
  var TIPOS = [];
  G.nos.forEach(function (n){ if (TIPOS.indexOf(n.tipo) < 0) TIPOS.push(n.tipo); });
  var TEM_ATOR = G.nos.some(function (n){ return !!n.ator; });
  var ATORES = TEM_ATOR ? G.nos.map(function (n){ return n.ator; })
    .filter(function (a, i, v){ return a && v.indexOf(a) === i; }) : [];

  q('fTipo').insertAdjacentHTML('beforeend', TIPOS.map(function (t){
    return '<button class="mp-chip" type="button" data-ftipo="' + t + '" aria-pressed="false">'
      + esc(ROTULO[t] || t) + '</button>'; }).join(''));
  q('fPrazo').insertAdjacentHTML('beforeend',
    ['curto','medio','longo','sem'].map(function (f){
      return '<button class="mp-chip" type="button" data-prazo="' + f + '" aria-pressed="false">'
        + esc(f === 'sem' ? 'sem prazo escrito' : FAIXA_PRAZO[f]) + '</button>'; }).join(''));
  q('fOutros').insertAdjacentHTML('beforeend',
    '<button class="mp-chip" type="button" data-so="peca" aria-pressed="false">só etapas com peça</button>'
    + '<button class="mp-chip" type="button" data-so="favorito" aria-pressed="false">só favoritos</button>'
    + (TEM_ATOR ? '<span style="display:flex;gap:6px;flex-wrap:wrap">' + ATORES.map(function (a){
        return '<button class="mp-chip" type="button" data-ator="' + esc(a) + '" aria-pressed="false">'
          + esc(a) + '</button>'; }).join('') + '</span>' : '')
    + '<button class="mp-chip" type="button" data-ram="abrir">⊞ Abrir ramificações</button>'
    + '<button class="mp-chip" type="button" data-ram="fechar">⊟ Recolher ramificações</button>'
    + '<button class="mp-bt mp-limpa" type="button" data-r="limpar">Limpar filtros</button>');

  /* ------------------------- o que está visível --------------------------- */
  function recolhido(n){ return !!(n.origem && st.recolhidas[n.origem]); }
  function visivel(n){ return !recolhido(n); }

  function passaFiltro(n){
    var f = st.filtros;
    var tipos = Object.keys(f.tipo).filter(function (k){ return f.tipo[k]; });
    if (tipos.length && tipos.indexOf(n.tipo) < 0) return false;
    if (f.prazo) {
      if (f.prazo === 'sem') { if (n.prazo) return false; }
      else if (!n.prazo || n.prazo.faixa !== f.prazo) return false;
    }
    if (f.peca && !n.peca) return false;
    if (f.favorito && !st.favoritos[n.id]) return false;
    if (f.ator && n.ator !== f.ator) return false;
    return true;
  }
  function filtrando(){
    var f = st.filtros;
    return Object.keys(f.tipo).some(function (k){ return f.tipo[k]; })
      || !!f.prazo || !!f.peca || !!f.favorito || !!f.ator;
  }

  /* rota e progresso */
  var rota = [], naRota = {}, trilha = {};
  function recalcular(){
    rota = window.CTMapaGrafo.rota(G, st.escolhas);
    naRota = {}; trilha = {};
    rota.forEach(function (id){ naRota[id] = 1; });
    var corte = rota.indexOf(st.ativo);
    if (corte < 0) corte = 0;
    for (var i = 0; i <= corte; i++) trilha[rota[i]] = 1;
    var pct = rota.length ? Math.round((corte + 1) / rota.length * 100) : 0;
    q('barra').style.width = pct + '%';
    q('pct').textContent = pct + '%';
    var pb = q('pbar');
    pb.setAttribute('aria-valuenow', String(pct));
    pb.setAttribute('aria-valuetext', 'etapa ' + (corte + 1) + ' de ' + rota.length + ' na rota escolhida');
  }

  /* ------------------------------- desenho ------------------------------- */
  function estadoDe(n){
    if (n.id === st.ativo) return 'etapa atual';
    if (trilha[n.id]) return 'percorrido';
    if (naRota[n.id]) return 'à frente';
    return 'fora da rota';
  }
  /* o mesmo estado em duas medidas: o cartão tem uma tira de 268px e a estrela do
     favorito no canto — ali "etapa atual" não cabe e virava "ETAPA AT…". */
  function estadoCurto(n){
    if (n.id === st.ativo) return 'aqui';
    if (trilha[n.id]) return 'feito';
    if (naRota[n.id]) return 'à frente';
    return 'fora';
  }

  function pintarNos(){
    /* o cartão inteiro é redesenhado a cada repintura; sem isto, favoritar ou
       recolher pelo teclado jogava o foco para o começo da página */
    var focado = null, ativoEl = document.activeElement;
    if (ativoEl && elNos.contains(ativoEl)) {
      focado = ['abrir','fav','recolhe','peca','legis'].map(function (k){
        return ativoEl.dataset && ativoEl.dataset[k] ? '[data-' + k + '="' + ativoEl.dataset[k] + '"]' : null;
      }).filter(Boolean)[0];
    }
    var html = G.nos.map(function (n){
      if (!visivel(n)) return '';
      var cls = ['mp-no'];
      if (n.id === st.ativo) cls.push('atual');
      if (trilha[n.id]) cls.push('trilha');
      if (n.origem && !naRota[n.id] && Object.keys(st.escolhas).length) cls.push('fora');
      if (filtrando() && !passaFiltro(n)) cls.push('apagada');
      var num = String(n.ordem + 1).padStart(2, '0');
      var rot = ROTULO[n.tipo] || 'Ato';
      var meta = [];
      if (n.prazo) meta.push('<span class="mp-prazo">⏱ ' + esc(n.prazo.texto) + '</span>');
      if (n.ator)  meta.push('<span class="mp-ator">' + esc(n.ator) + '</span>');
      if (n.rotulo) meta.push('<span class="mp-ator">via “' + esc(n.rotulo) + '”</span>');
      var rod = [];
      if (n.art) rod.push('<button class="mp-art" type="button" data-legis="' + esc(n.art) + '" data-no="' + n.id
        + '" title="Abrir no CátedraLEGIS: ' + esc(n.art) + '">⚖️ ' + esc(n.art) + '</button>');
      if (n.peca) rod.push('<button class="mp-pc" type="button" data-peca="' + esc(n.peca) + '" data-no="' + n.id
        + '">✍️ Abrir ' + esc(n.peca) + (n.pecaPronta ? '' : ' · em breve') + '</button>');
      if (n.ramos.length) rod.push('<button class="mp-ram" type="button" data-recolhe="' + n.id + '"'
        + ' aria-pressed="' + (st.recolhidas[n.id] ? 'true' : 'false') + '">'
        + (st.recolhidas[n.id] ? '⊞ ' + n.ramos.length : '⊟ ' + n.ramos.length) + '</button>');
      var aria = rot + ' ' + (n.ordem + 1) + '. ' + n.titulo + '. ' + (n.resumo ? n.resumo + '. ' : '')
        + (n.prazo ? 'Prazo ' + n.prazo.texto + '. ' : '') + (n.art ? 'Fundamento ' + n.art + '. ' : '')
        + 'Situação: ' + estadoDe(n) + '.';
      return '<article class="' + cls.join(' ') + '" data-id="' + n.id + '" data-tipo="' + n.tipo + '"'
        + ' style="left:' + n.x + 'px;top:' + n.y + 'px;width:' + CARTAO.l + 'px;height:' + CARTAO.a + 'px">'
        + '<button class="mp-abrir" type="button" data-abrir="' + n.id + '" aria-label="' + esc(aria) + '">'
        +   '<span class="mp-topo"><span class="num">' + num + '</span><span>' + esc(rot) + '</span>'
        +     '<span class="est">' + esc(estadoCurto(n)) + '</span></span>'
        +   '<strong>' + esc(n.titulo) + '</strong>'
        +   (n.resumo ? '<small>' + esc(n.resumo) + '</small>' : '')
        +   (meta.length ? '<span class="mp-linha">' + meta.join('') + '</span>' : '')
        + '</button>'
        + (rod.length ? '<div class="mp-rod">' + rod.join('') + '</div>' : '')
        + '<button class="mp-fav" type="button" data-fav="' + n.id + '" aria-pressed="'
        +   (st.favoritos[n.id] ? 'true' : 'false') + '" aria-label="Favoritar ' + esc(n.titulo) + '">★</button>'
        + '</article>';
    }).join('');
    elNos.innerHTML = html;
    if (focado) { var volta = elNos.querySelector(focado); if (volta) try { volta.focus(); } catch (e) {} }
  }

  var CORES = { principal:'#4cc7ef', retorno:'#4cc7ef', alternativa:'#ac91ff',
                rejeicao:'#f2705a', trilha:'#54d8a6' };

  function pintarLinhas(){
    var defs = Object.keys(CORES).map(function (k){
      return '<marker id="mp-seta-' + k + '" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5"'
        + ' orient="auto"><path d="M0 0 L9 4.5 L0 9 z" fill="' + CORES[k] + '"></path></marker>'; }).join('');
    var corpo = G.arestas.map(function (a){
      var de = G.porId[a.de], para = G.porId[a.para];
      if (!de || !para) return '';
      /* ramificação recolhida: a decisão liga direto ao passo seguinte */
      if (!visivel(de) || !visivel(para)) return '';
      var sx = de.x + CARTAO.l, sy = de.y + CARTAO.a / 2, tx = para.x, ty = para.y + CARTAO.a / 2;
      var naTrilha = trilha[a.de] && trilha[a.para];
      var apaga = Object.keys(st.escolhas).length && !(naRota[a.de] && naRota[a.para]);
      var cls = 'mp-l-' + a.tipo + (naTrilha ? ' trilha' : '') + (apaga ? ' apagada' : '');
      var marca = naTrilha ? 'trilha' : a.tipo;
      var mx = sx + (tx - sx) / 2, my = (sy < ty ? sy : ty) + Math.abs(ty - sy) / 2;
      return '<g class="' + cls + '" data-aresta="' + esc(a.id) + '">'
        + '<path d="' + caminho(sx, sy, tx, ty) + '" marker-end="url(#mp-seta-' + marca + ')"></path>'
        + (a.rot ? '<text x="' + mx + '" y="' + (Math.abs(ty - sy) < 1 ? sy - 9 : my) + '" text-anchor="middle">'
            + esc(a.rot) + '</text>' : '')
        + '</g>';
    }).join('');
    /* decisão recolhida: uma seta só, dizendo quantos caminhos ficaram guardados */
    var atalhos = G.nos.filter(function (n){ return n.ramos.length && st.recolhidas[n.id] && n.proximo; })
      .map(function (n){
        var para = G.porId[n.proximo]; if (!para || !visivel(para)) return '';
        var sx = n.x + CARTAO.l, sy = n.y + CARTAO.a / 2, tx = para.x, ty = para.y + CARTAO.a / 2;
        return '<g class="mp-l-alternativa"><path d="' + caminho(sx, sy, tx, ty)
          + '" marker-end="url(#mp-seta-alternativa)"></path>'
          + '<text x="' + (sx + (tx - sx) / 2) + '" y="' + (sy - 9) + '" text-anchor="middle">'
          + n.ramos.length + ' caminhos recolhidos</text></g>'; }).join('');
    elLinhas.setAttribute('viewBox', '0 0 ' + G.largura + ' ' + G.altura);
    elLinhas.setAttribute('width', G.largura); elLinhas.setAttribute('height', G.altura);
    elLinhas.innerHTML = '<defs>' + defs + '</defs>' + corpo + atalhos;
  }

  function pintarMini(){
    var ex = 216 / G.largura, ey = 104 / G.altura;
    var vw = Math.min(G.largura, elPalco.clientWidth / st.z);
    var vh = Math.min(G.altura, elPalco.clientHeight / st.z);
    var vx = Math.max(0, -st.x / st.z), vy = Math.max(0, -st.y / st.z);
    elMini.innerHTML = '<svg viewBox="0 0 236 126"><g transform="translate(10 11)">'
      + G.nos.filter(visivel).map(function (n){
          var c = 'n' + (n.id === st.ativo ? ' atual' : (trilha[n.id] ? ' trilha' : ''));
          return '<rect class="' + c + '" x="' + (n.x * ex).toFixed(1) + '" y="' + (n.y * ey).toFixed(1)
            + '" width="' + Math.max(4, CARTAO.l * ex).toFixed(1) + '" height="'
            + Math.max(3, CARTAO.a * ey).toFixed(1) + '" rx="1.5"></rect>'; }).join('')
      + '<rect class="vis" x="' + (vx * ex).toFixed(1) + '" y="' + (vy * ey).toFixed(1)
      + '" width="' + (vw * ex).toFixed(1) + '" height="' + (vh * ey).toFixed(1) + '" rx="2"></rect>'
      + '</g></svg>';
  }

  function aplicar(){
    elMundo.style.transform = 'translate(' + st.x.toFixed(1) + 'px,' + st.y.toFixed(1) + 'px) scale(' + st.z + ')';
    elLupa.textContent = Math.round(st.z * 100) + '%';
    pintarMini();
  }
  function repintar(){ recalcular(); pintarNos(); pintarLinhas(); aplicar(); guardar(); }

  /* ------------------------------ navegação ------------------------------ */
  /* Dentro do app o iframe do módulo nasce montado e ESCONDIDO — o palco mede 0×0
     até a tela ser aberta. Enquadrar nessa hora dá um zoom absurdo e uma posição
     inventada. Então o que depende de medida fica na fila e roda quando o palco
     ganha tamanho de verdade. */
  var espera = null;
  function pronto(){ return elPalco.clientWidth > 40 && elPalco.clientHeight > 40; }
  function naFila(){
    if (!pronto() || !espera) return;
    var e = espera; espera = null;
    if (e === 'ajustar') ajustar(); else centrar(e.id, e.z);
  }

  function zoomEm(z, cx, cy){
    var novo = Math.min(1.8, Math.max(.18, z));
    var r = elPalco.getBoundingClientRect();
    var px = (cx == null ? r.width / 2 : cx - r.left), py = (cy == null ? r.height / 2 : cy - r.top);
    var wx = (px - st.x) / st.z, wy = (py - st.y) / st.z;
    st.x = px - wx * novo; st.y = py - wy * novo; st.z = novo;
    aplicar(); guardar();
  }
  function ajustar(){
    if (!pronto()) { espera = 'ajustar'; return; }
    var vis = G.nos.filter(visivel);
    var x0 = Math.min.apply(null, vis.map(function (n){ return n.x; })) - 40;
    var y0 = Math.min.apply(null, vis.map(function (n){ return n.y; })) - 40;
    var x1 = Math.max.apply(null, vis.map(function (n){ return n.x + CARTAO.l; })) + 40;
    var y1 = Math.max.apply(null, vis.map(function (n){ return n.y + CARTAO.a; })) + 40;
    var z = Math.min(1.1, Math.max(.18, Math.min(elPalco.clientWidth / (x1 - x0), elPalco.clientHeight / (y1 - y0))));
    st.z = z;
    st.x = (elPalco.clientWidth - (x1 - x0) * z) / 2 - x0 * z;
    st.y = (elPalco.clientHeight - (y1 - y0) * z) / 2 - y0 * z;
    aplicar(); guardar();
    avisar('Rito inteiro enquadrado: ' + vis.length + ' etapas visíveis.');
  }
  function centrar(id, z){
    var n = G.porId[id || st.ativo]; if (!n) return;
    if (recolhido(n) && n.origem) n = G.porId[n.origem];
    if (!pronto()) { espera = { id: n.id, z: z }; return; }
    st.z = Math.min(1.25, Math.max(.4, z || Math.max(st.z, .78)));
    st.x = elPalco.clientWidth / 2 - (n.x + CARTAO.l / 2) * st.z;
    st.y = elPalco.clientHeight / 2 - (n.y + CARTAO.a / 2) * st.z;
    aplicar(); guardar();
  }
  function ativar(id, centralizar){
    if (!G.porId[id]) return;
    st.ativo = id; repintar();
    if (centralizar !== false) centrar(id);
    avisar(G.porId[id].titulo + ' — ' + estadoDe(G.porId[id]) + '.');
  }
  function andar(d){
    var i = rota.indexOf(st.ativo);
    if (i < 0) { ativar(rota[0]); return; }
    var j = Math.max(0, Math.min(rota.length - 1, i + d));
    if (j !== i) ativar(rota[j]);
  }

  /* --------------------------------- busca -------------------------------- */
  function buscar(){
    var t = sa(st.busca.trim());
    st.achados = []; st.iAchado = -1;
    if (t) {
      var termos = t.split(/\s+/).filter(Boolean);
      st.achados = G.nos.filter(function (n){
        if (!visivel(n)) return false;
        var alvo = sa([n.titulo, n.resumo, n.art, n.nota, n.peca, n.ator, n.rotulo,
                       ROTULO[n.tipo], n.prazo && n.prazo.texto, (n.leis||[]).join(' '),
                       (n.jurisps||[]).join(' ')].filter(Boolean).join(' '));
        return termos.every(function (p){ return alvo.indexOf(p) >= 0; });
      }).map(function (n){ return n.id; });
    }
    elNos.querySelectorAll('.mp-no').forEach(function (e){
      e.classList.toggle('achou', st.achados.indexOf(e.dataset.id) >= 0); });
    elConta.textContent = t ? (st.achados.length ? st.achados.length + (st.achados.length > 1 ? ' achados' : ' achado') : 'nada') : '';
    if (t) avisar(st.achados.length + ' etapa(s) encontrada(s) para “' + st.busca.trim() + '”.');
  }
  function proximoAchado(){
    if (!st.achados.length) return;
    st.iAchado = (st.iAchado + 1) % st.achados.length;
    var id = st.achados[st.iAchado];
    ativar(id);
    avisar(G.porId[id].titulo + ' — resultado ' + (st.iAchado + 1) + ' de ' + st.achados.length + ', centralizado.');
  }

  /* ------------------------------ painel lateral -------------------------- */
  var velo = null, painel = null, focoAnterior = null;
  function fechar(){
    if (velo) { velo.remove(); velo = null; }
    if (painel) { painel.remove(); painel = null; }
    st.aberto = null;
    /* volta o foco para onde a pessoa estava — no cartão que ela abriu, não no topo */
    if (focoAnterior && document.contains(focoAnterior)) { try { focoAnterior.focus(); } catch (e) {} }
    else { try { elPalco.focus(); } catch (e) {} }
    focoAnterior = null;
  }
  function focaveis(){
    return [].slice.call(painel.querySelectorAll('button, textarea, input, a[href], [tabindex]:not([tabindex="-1"])'))
      .filter(function (x){ return !x.disabled && x.offsetParent !== null; });
  }
  function moldura(kick, titulo, acoes, corpo){
    if (!painel) {
      focoAnterior = document.activeElement;
      velo = document.createElement('div'); velo.className = 'mp-velo'; velo.onclick = fechar;
      painel = document.createElement('aside'); painel.className = 'mp-painel';
      painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-modal', 'true');
      painel.setAttribute('aria-label', titulo);
      /* aria-modal sem prender o Tab é promessa falsa: o leitor de tela anuncia
         "diálogo" e a tabulação sai por baixo para o mapa que está inerte. */
      painel.addEventListener('keydown', function (e){
        if (e.key !== 'Tab') return;
        var f = focaveis(); if (!f.length) return;
        var pri = f[0], ult = f[f.length - 1];
        if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); }
        else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
      });
      document.body.appendChild(velo); document.body.appendChild(painel);
    }
    painel.setAttribute('aria-label', titulo);
    painel.innerHTML = '<div class="mp-pcab"><span class="kick">' + esc(kick) + '</span>'
      + '<div class="lin"><h3>' + esc(titulo) + '</h3>'
      + '<button class="mp-x" type="button" data-p="x" aria-label="Fechar painel">✕</button></div></div>'
      + (acoes ? '<div class="mp-pacs">' + acoes + '</div>' : '')
      + '<div class="mp-pcorpo">' + corpo + '</div>';
    painel.querySelector('[data-p=x]').onclick = fechar;
    painel.querySelector('[data-p=x]').focus();
  }
  function sec(t, c){ return '<section class="mp-sec"><h4>' + esc(t) + '</h4>' + c + '</section>'; }

  /* painel da ETAPA */
  function abrirNo(id){
    var n = G.porId[id]; if (!n) return;
    st.aberto = { tipo: 'no', id: id };
    var corpo = '';
    corpo += sec('Situação', '<p><b>' + esc(ROTULO[n.tipo] || 'Ato') + ' ' + (n.ordem + 1)
      + '</b> · ' + esc(estadoDe(n)) + (n.rotulo ? ' · chegou por “' + esc(n.rotulo) + '”' : '') + '</p>'
      + (n.resumo ? '<p>' + esc(n.resumo) + '</p>' : ''));
    if (n.prazo) corpo += sec('Prazo', '<p>' + esc(n.prazo.texto) + ' — '
      + esc(FAIXA_PRAZO[n.prazo.faixa]) + '.</p><p class="mp-vazio">Prazo lido do texto do próprio rito.</p>');
    if (n.ator) corpo += sec('Responsável pelo ato', '<p>' + esc(n.ator) + '</p>');
    if (n.art || (n.leis || []).length || (n.jurisps || []).length) {
      var refs = [];
      if (n.art) refs.push('<button class="lei" type="button" data-legis="' + esc(n.art) + '">⚖️ ' + esc(n.art) + '</button>');
      (n.leis || []).forEach(function (l){ refs.push('<button class="lei" type="button" data-legis="' + esc(l) + '">⚖️ ' + esc(l) + '</button>'); });
      (n.jurisps || []).forEach(function (j){ refs.push('<button class="jur" type="button" data-juris="' + esc(j) + '">🏛️ ' + esc(j) + '</button>'); });
      corpo += sec('Fundamento legal', '<div class="mp-refs">' + refs.join('') + '</div>');
    }
    if (n.nota) corpo += sec('Nota do rito', '<p>' + esc(n.nota) + '</p>');
    if (n.ramos.length) {
      corpo += sec('Escolha o caminho', '<div class="mp-escolhas">' + n.ramos.map(function (r){
        var b = G.porId[r];
        return '<button type="button" class="' + (b.tipo === 'rejeicao' ? 'rej' : '') + '" data-escolhe="'
          + r + '" aria-pressed="' + (st.escolhas[n.id] === r ? 'true' : 'false') + '">'
          + esc(b.rotulo || b.titulo) + ' → ' + esc(b.titulo) + '</button>'; }).join('')
        + '</div><p class="mp-vazio" style="margin-top:9px">A escolha destaca a rota e apaga o que ficou '
        + 'incompatível — nada é apagado do mapa, e dá para trocar quando quiser.</p>'
        + (st.escolhas[n.id] ? '<div style="margin-top:9px"><button class="mp-bt" type="button" data-desfaz="'
          + n.id + '">Desfazer esta escolha</button></div>' : ''));
    }
    if (n.peca) corpo += sec('Peça desta etapa',
      '<div class="mp-refs"><button class="lei" type="button" data-peca="' + esc(n.peca) + '">✍️ Abrir '
      + esc(n.peca) + '</button></div>'
      + (n.pecaPronta ? '' : '<p class="mp-vazio" style="margin-top:8px">O roteiro desta peça ainda não foi escrito.</p>'));
    corpo += sec('Minhas anotações',
      '<textarea class="mp-nota" data-nota="' + n.id + '" placeholder="o que você quer lembrar desta etapa…">'
      + esc(st.notas[n.id] || '') + '</textarea><span class="mp-salvo" data-salvo hidden>anotação guardada</span>');

    var acoes = '<button class="mp-bt" type="button" data-p="fav" aria-pressed="'
      + (st.favoritos[n.id] ? 'true' : 'false') + '">★ Favoritar</button>'
      + '<button class="mp-bt" type="button" data-p="centrar">◎ Centralizar</button>'
      + '<button class="mp-bt" type="button" data-p="copiar">⧉ Copiar resumo</button>'
      + '<button class="mp-bt" type="button" data-p="imprimir">⎙ Imprimir</button>';

    moldura((G.ramo || '') + ' · etapa ' + (n.ordem + 1), n.titulo, acoes, corpo);
    ligarPainel(n);
  }

  /* painel da PEÇA */
  function abrirPeca(nome, deNo){
    var p = PECAS[nome];
    st.aberto = { tipo: 'peca', id: nome };
    var no = deNo && G.porId[deNo];
    var corpo = '';
    if (!p) {
      corpo = sec('Roteiro', '<p class="mp-vazio">O roteiro desta peça ainda não foi escrito. '
        + 'As peças com roteiro pronto hoje são: ' + esc(Object.keys(PECAS).join(' · ')) + '.</p>');
    } else {
      if (p.sobre) corpo += sec('O que a peça é', '<p>' + esc(p.sobre) + '</p>');
      if (no && no.prazo) corpo += sec('Prazo', '<p>' + esc(no.prazo.texto) + ' — '
        + esc(FAIXA_PRAZO[no.prazo.faixa]) + ', segundo a etapa “' + esc(no.titulo) + '”.</p>');
      corpo += sec('Roteiro', (p.blocos || []).map(function (b, i){
        return '<div class="bl"><h5>' + (i + 1) + '. ' + esc(b.nome) + '</h5><p>' + esc(b.deve) + '</p>'
          + ((b.itens || []).length ? '<ol>' + b.itens.map(function (x){
              return '<li>' + (x.t ? '<b>' + esc(x.t) + '</b> — ' : '') + esc(x.d || '') + '</li>'; }).join('') + '</ol>' : '')
          + (b.erro ? '<p style="color:#ffb2a2"><b>⚠ Custa ponto:</b> ' + esc(b.erro) + '</p>' : '')
          + '</div>'; }).join('') || '<p class="mp-vazio">Sem blocos escritos.</p>');
      if ((p.cego || []).length) corpo += sec('Requisitos — o que não pode faltar',
        '<ul>' + p.cego.map(function (t){ return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>');
      var refs = [];
      (p.blocos || []).forEach(function (b){
        (b.lei || []).forEach(function (l){ refs.push('<button class="lei" type="button" data-legis="' + esc(l) + '">⚖️ ' + esc(l) + '</button>'); });
        (b.juris || []).forEach(function (j){ refs.push('<button class="jur" type="button" data-juris="' + esc(j) + '">🏛️ ' + esc(j) + '</button>'); });
      });
      if (refs.length) corpo += sec('Fundamentação', '<div class="mp-refs">' + refs.join('') + '</div>');
      var dicas = (p.dicas || []).map(function (d){ return typeof d === 'object' ? d.t : d; });
      var esps = p.especiais || [];
      if (dicas.length || esps.length) corpo += sec('Dicas',
        (dicas.length ? '<ul>' + dicas.map(function (d){ return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' : '')
        + (esps.length ? '<div class="bl"><h5>Casos especiais</h5><ul>' + esps.map(function (x){
            return '<li><b>' + esc(x.t) + '</b> — ' + esc(x.d) + '</li>'; }).join('') + '</ul></div>' : ''));
      var modelos = (p.blocos || []).filter(function (b){ return b.modelo; });
      if (modelos.length) corpo += sec('Texto-base', modelos.map(function (b){
        return '<div class="bl"><h5>' + esc(b.nome) + '</h5><pre class="mp-modelo">' + esc(b.modelo) + '</pre></div>'; }).join(''));
      corpo += sec('Rascunho', '<textarea class="mp-rasc" data-rasc="' + esc(nome)
        + '" placeholder="escreva aqui o seu rascunho da peça — fica guardado neste aparelho…">'
        + esc(st.rascunhos[nome] || '') + '</textarea><span class="mp-salvo" data-salvo hidden>rascunho guardado</span>');
    }
    var acoes = '<button class="mp-bt" type="button" data-p="favp" aria-pressed="'
      + (st.favoritos['peca:' + nome] ? 'true' : 'false') + '">★ Favoritar</button>'
      + '<button class="mp-bt" type="button" data-p="copiar">⧉ Copiar</button>'
      + '<button class="mp-bt" type="button" data-p="imprimir">⎙ Imprimir</button>'
      + '<button class="mp-bt" type="button" data-p="rasc">✎ Editar rascunho</button>'
      + (p && op.aoRoteiro ? '<button class="mp-bt" type="button" data-p="roteiro">↗ Roteiro completo</button>' : '');
    moldura('Peça processual' + (no ? ' · etapa ' + (no.ordem + 1) : ''), nome, acoes, corpo);
    ligarPainel(no, nome);
  }

  function textoDoPainel(){
    if (!painel) return '';
    var t = painel.querySelector('h3').textContent;
    return t + '\n' + '='.repeat(t.length) + '\n\n' + painel.querySelector('.mp-pcorpo').innerText;
  }

  function ligarPainel(n, nomePeca){
    if (!painel) return;
    painel.querySelectorAll('[data-legis]').forEach(function (b){
      b.onclick = function (){ if (op.aoAcervo) op.aoAcervo('legis', b.dataset.legis, { rito: G.rito, peca: nomePeca || null }); }; });
    painel.querySelectorAll('[data-juris]').forEach(function (b){
      b.onclick = function (){ if (op.aoAcervo) op.aoAcervo('juris', b.dataset.juris, { rito: G.rito, peca: nomePeca || null }); }; });
    painel.querySelectorAll('[data-peca]').forEach(function (b){
      b.onclick = function (){ abrirPeca(b.dataset.peca, n && n.id); }; });
    painel.querySelectorAll('[data-escolhe]').forEach(function (b){
      b.onclick = function (){
        st.escolhas[n.id] = b.dataset.escolhe;
        st.ativo = b.dataset.escolhe;
        repintar(); centrar(st.ativo); abrirNo(n.id);
        avisar('Caminho escolhido: ' + G.porId[b.dataset.escolhe].titulo + '. A rota e o progresso foram recalculados.');
      }; });
    var desfaz = painel.querySelector('[data-desfaz]');
    if (desfaz) desfaz.onclick = function (){
      delete st.escolhas[desfaz.dataset.desfaz]; repintar(); abrirNo(desfaz.dataset.desfaz);
      avisar('Escolha desfeita. A rota voltou ao caminho ordinário do rito.'); };

    var salvo = painel.querySelector('[data-salvo]');
    var nota = painel.querySelector('[data-nota]');
    if (nota) nota.oninput = function (){
      st.notas[nota.dataset.nota] = nota.value; guardar();
      if (salvo) { salvo.hidden = false; clearTimeout(salvo._t); salvo._t = setTimeout(function (){ salvo.hidden = true; }, 1500); } };
    var rasc = painel.querySelector('[data-rasc]');
    if (rasc) rasc.oninput = function (){
      st.rascunhos[rasc.dataset.rasc] = rasc.value; guardar();
      if (salvo) { salvo.hidden = false; clearTimeout(salvo._t); salvo._t = setTimeout(function (){ salvo.hidden = true; }, 1500); } };

    var bt = function (k){ return painel.querySelector('[data-p="' + k + '"]'); };
    if (bt('fav')) bt('fav').onclick = function (){
      st.favoritos[n.id] = !st.favoritos[n.id];
      if (!st.favoritos[n.id]) delete st.favoritos[n.id];
      this.setAttribute('aria-pressed', st.favoritos[n.id] ? 'true' : 'false');
      repintar(); avisar(st.favoritos[n.id] ? 'Etapa favoritada.' : 'Favorito removido.'); };
    if (bt('favp')) bt('favp').onclick = function (){
      var k = 'peca:' + nomePeca;
      st.favoritos[k] = !st.favoritos[k]; if (!st.favoritos[k]) delete st.favoritos[k];
      this.setAttribute('aria-pressed', st.favoritos[k] ? 'true' : 'false'); guardar();
      avisar(st.favoritos[k] ? 'Peça favoritada.' : 'Favorito removido.'); };
    if (bt('centrar')) bt('centrar').onclick = function (){ ativar(n.id); fechar(); };
    if (bt('copiar')) bt('copiar').onclick = function (){
      var b = this;
      try { navigator.clipboard.writeText(textoDoPainel()).then(function (){
        b.textContent = '✓ Copiado'; setTimeout(function (){ b.textContent = '⧉ Copiar'; }, 1500); }, function (){}); } catch (e) {} };
    if (bt('imprimir')) bt('imprimir').onclick = function (){ window.print(); };
    if (bt('rasc')) bt('rasc').onclick = function (){
      var t = painel.querySelector('[data-rasc]'); if (!t) return;
      t.scrollIntoView({ block: 'center' }); t.focus(); };
    if (bt('roteiro')) bt('roteiro').onclick = function (){ fechar(); op.aoRoteiro(nomePeca); };
  }

  /* ------------------------------- eventos -------------------------------- */
  elNos.addEventListener('click', function (e){
    var b;
    if ((b = e.target.closest('[data-legis]'))) {
      st.ativo = b.dataset.no; repintar();
      if (op.aoAcervo) op.aoAcervo('legis', b.dataset.legis, { rito: G.rito }); return; }
    if ((b = e.target.closest('[data-peca]'))) { st.ativo = b.dataset.no; repintar(); abrirPeca(b.dataset.peca, b.dataset.no); return; }
    if ((b = e.target.closest('[data-recolhe]'))) {
      var id = b.dataset.recolhe;
      st.recolhidas[id] = !st.recolhidas[id]; if (!st.recolhidas[id]) delete st.recolhidas[id];
      repintar(); buscar();
      avisar(st.recolhidas[id] ? 'Ramificação recolhida.' : 'Ramificação aberta.'); return; }
    if ((b = e.target.closest('[data-fav]'))) {
      var f = b.dataset.fav; st.favoritos[f] = !st.favoritos[f]; if (!st.favoritos[f]) delete st.favoritos[f];
      repintar(); avisar(st.favoritos[f] ? 'Etapa favoritada.' : 'Favorito removido.'); return; }
    if ((b = e.target.closest('[data-abrir]'))) {
      if (st.moveu > 5) return;
      st.ativo = b.dataset.abrir; repintar(); abrirNo(b.dataset.abrir); }
  });
  /* o cartão que ganha foco pelo Tab é trazido para a tela: o mundo é transformado,
     e o navegador não sabe rolar dentro de um transform */
  elNos.addEventListener('focusin', function (e){
    var art = e.target.closest('.mp-no'); if (!art) return;
    var n = G.porId[art.dataset.id]; if (!n) return;
    var ex = n.x * st.z + st.x, ey = n.y * st.z + st.y;
    if (ex < 10 || ey < 10 || ex + CARTAO.l * st.z > elPalco.clientWidth - 10
        || ey + CARTAO.a * st.z > elPalco.clientHeight - 10) centrar(n.id, st.z);
  });

  elPalco.addEventListener('pointerdown', function (e){
    if (e.target.closest('button, input, textarea, .mp-mini, .mp-zoom')) return;
    st.arrastando = true; st.px = e.clientX; st.py = e.clientY; st.moveu = 0;
    elPalco.classList.add('arrastando');
    try { elPalco.setPointerCapture(e.pointerId); } catch (x) {}
  });
  elPalco.addEventListener('pointermove', function (e){
    if (!st.arrastando) return;
    st.x += e.clientX - st.px; st.y += e.clientY - st.py;
    st.moveu += Math.abs(e.clientX - st.px) + Math.abs(e.clientY - st.py);
    st.px = e.clientX; st.py = e.clientY; aplicar();
  });
  function soltar(e){
    if (!st.arrastando) return;
    st.arrastando = false; elPalco.classList.remove('arrastando'); guardar();
    try { elPalco.releasePointerCapture(e.pointerId); } catch (x) {}
    setTimeout(function (){ st.moveu = 0; }, 40);
  }
  elPalco.addEventListener('pointerup', soltar);
  elPalco.addEventListener('pointercancel', soltar);
  elPalco.addEventListener('wheel', function (e){
    /* roda com shift, ou trackpad na horizontal, ROLA de lado; roda pura AMPLIA */
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault(); st.x -= (e.deltaX || e.deltaY); aplicar(); guardar(); return; }
    e.preventDefault(); zoomEm(st.z * Math.exp(-e.deltaY * .0013), e.clientX, e.clientY);
  }, { passive: false });

  elPalco.addEventListener('keydown', function (e){
    if (e.target !== elPalco) return;
    var p = e.shiftKey ? 220 : 90;
    if (e.key === 'ArrowLeft')      { st.x += p; }
    else if (e.key === 'ArrowRight'){ st.x -= p; }
    else if (e.key === 'ArrowUp')   { st.y += p; }
    else if (e.key === 'ArrowDown') { st.y -= p; }
    else if (e.key === '+' || e.key === '=') { zoomEm(st.z * 1.2); return e.preventDefault(); }
    else if (e.key === '-' || e.key === '_') { zoomEm(st.z / 1.2); return e.preventDefault(); }
    else if (e.key === '0')  { ajustar(); return e.preventDefault(); }
    else if (e.key === 'c' || e.key === 'C') { centrar(); return e.preventDefault(); }
    else if (e.key === 'n' || e.key === 'N') { andar(1); return e.preventDefault(); }
    else if (e.key === 'p' || e.key === 'P') { andar(-1); return e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === ' ') { abrirNo(st.ativo); return e.preventDefault(); }
    else return;
    e.preventDefault(); aplicar(); guardar();
  });

  elMini.addEventListener('click', function (e){
    var r = elMini.getBoundingClientRect();
    var x = Math.max(0, Math.min(1, (e.clientX - r.left - 10) / (r.width - 20))) * G.largura;
    var y = Math.max(0, Math.min(1, (e.clientY - r.top - 11) / (r.height - 22))) * G.altura;
    st.x = elPalco.clientWidth / 2 - x * st.z; st.y = elPalco.clientHeight / 2 - y * st.z;
    aplicar(); guardar();
  });

  elBusca.addEventListener('input', function (){ st.busca = elBusca.value; buscar(); });
  elBusca.addEventListener('keydown', function (e){
    if (e.key === 'Enter') { e.preventDefault(); proximoAchado(); }
    if (e.key === 'Escape'){ elBusca.value = ''; st.busca = ''; buscar(); } });

  q('mais').onclick    = function (){ zoomEm(st.z * 1.2); };
  q('menos').onclick   = function (){ zoomEm(st.z / 1.2); };
  q('ajustar').onclick = ajustar;
  q('centrar').onclick = function (){ centrar(); avisar('Etapa atual centralizada: ' + G.porId[st.ativo].titulo + '.'); };
  q('ferr').onclick = function (){
    var abre = elFerr.hidden;
    elFerr.hidden = !abre;
    this.setAttribute('aria-pressed', String(abre)); this.setAttribute('aria-expanded', String(abre)); };

  elFerr.addEventListener('click', function (e){
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.ftipo){ st.filtros.tipo[b.dataset.ftipo] = !st.filtros.tipo[b.dataset.ftipo];
      b.setAttribute('aria-pressed', String(!!st.filtros.tipo[b.dataset.ftipo])); }
    else if (b.dataset.prazo){ var v = b.dataset.prazo;
      st.filtros.prazo = st.filtros.prazo === v ? '' : v;
      elFerr.querySelectorAll('[data-prazo]').forEach(function (o){
        o.setAttribute('aria-pressed', String(o.dataset.prazo === st.filtros.prazo)); }); }
    else if (b.dataset.so){ st.filtros[b.dataset.so] = !st.filtros[b.dataset.so];
      b.setAttribute('aria-pressed', String(!!st.filtros[b.dataset.so])); }
    else if (b.dataset.ator){ var a = b.dataset.ator;
      st.filtros.ator = st.filtros.ator === a ? '' : a;
      elFerr.querySelectorAll('[data-ator]').forEach(function (o){
        o.setAttribute('aria-pressed', String(o.dataset.ator === st.filtros.ator)); }); }
    else if (b.dataset.ram){
      var fechar_ = b.dataset.ram === 'fechar';
      G.nos.forEach(function (n){ if (n.ramos.length){ if (fechar_) st.recolhidas[n.id] = true; else delete st.recolhidas[n.id]; } });
      repintar(); buscar(); avisar(fechar_ ? 'Todas as ramificações recolhidas.' : 'Todas as ramificações abertas.'); return; }
    else if (b.dataset.r === 'limpar'){
      st.filtros = { tipo:{}, prazo:'', peca:false, favorito:false, ator:'' };
      elFerr.querySelectorAll('[aria-pressed]').forEach(function (o){ o.setAttribute('aria-pressed','false'); });
      avisar('Filtros limpos.'); }
    else return;
    var quantos = G.nos.filter(function (n){ return visivel(n) && passaFiltro(n); }).length;
    repintar();
    if (filtrando()) avisar(quantos + ' etapa(s) atendem aos filtros.');
  });

  /* o Esc é escutado no documento (o painel pode não estar com o foco), e por isso
     PRECISA sair no destruir: trocar de rito remonta o mapa, e sem remover o de antes
     cada troca deixava um ouvinte preso a uma instância que já não existe */
  var aoEscape = function (e){ if (e.key === 'Escape' && painel) fechar(); };
  document.addEventListener('keydown', aoEscape);
  var aoRedimensionar = function (){ naFila(); aplicar(); };
  window.addEventListener('resize', aoRedimensionar);
  /* o palco pode ganhar tamanho sem que a janela mude: é o que acontece quando o
     app troca de tela e o iframe sai do display:none */
  var olho = window.ResizeObserver ? new ResizeObserver(function (){ naFila(); aplicar(); }) : null;
  if (olho) olho.observe(elPalco);

  /* ------------------------------- partida -------------------------------- */
  recalcular(); pintarNos(); pintarLinhas();
  if (st.vista && isFinite(st.vista.x)) { st.x = st.vista.x; st.y = st.vista.y; st.z = st.vista.z || .72; aplicar(); }
  else ajustar();

  return {
    ir: function (id){ ativar(id); },
    ativo: function (){ return st.ativo; },
    ajustar: ajustar,
    abrirPeca: abrirPeca,
    destruir: function (){ fechar();
      window.removeEventListener('resize', aoRedimensionar);
      document.removeEventListener('keydown', aoEscape);
      if (olho) try { olho.disconnect(); } catch (e) {}
      raiz.innerHTML = ''; }
  };
}

window.CTMapa = { montar: montar };
})();
