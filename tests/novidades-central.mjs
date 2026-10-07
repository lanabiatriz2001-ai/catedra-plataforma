/* CENTRAL DE NOVIDADES (fontes oficiais: Planalto, STF e STJ) — medida, não presumida.
   A tela nasceu do pedido de 15/09/2026 e foi fundida em 01/10/2026 (Claude × Codex): o resumo
   no Início e a Central inteira em "Mais opções". O que se prova:
   (a) estático: novidades.js nas duas listas de cópia e na casca do worker; o <script> no <head>;
       novidLidas global, no _autosaveKeys e em ARRAY_ID (fora do EXCLUDE e de AREA_PROPRIA);
       estado só de tela fora do autosave; a guarda de área e a volta à origem; e o trecho
       inserido sem cor fixa (#hex, rgba() literal, var(--x,#hex));
   (b) a Central pinta o pacote: por fonte, o que monitora, TODOS os limites (abrem com um toque,
       com a contagem no rótulo), as duas datas por extenso, o erro; a fonte que falhou NUNCA
       aparece como "nenhuma novidade"; a frase da dona no topo; contraste CALCULADO de todo texto
       (≥ 4,5:1) nas OITO direções, no claro e no escuro, gradiente do hero incluído; o anel de
       foco do botão do hero acompanha o texto branco e passa de 3:1 sobre o gradiente;
   (c) filtros (fonte, tipo, disciplina, norma, período com relógio fixo, assunto sem acento,
       só não lidas), com aria-pressed; disciplina nunca sai como sigla crua;
   (d) "Marcar como lida" grava [{id, up, st:'lida'}] em catedra:novidLidas, não duplica e
       sobrevive ao reload;
   (e) "Comparar antes e depois" pinta as duas versões, com aria-expanded/aria-controls (sem
       aria-controls apontando para o vazio quando fechada);
   (f) "Abrir o texto oficial" é <a target=_blank rel=noopener noreferrer> só para https oficial,
       e diz que abre em nova janela;
   (g) "Agendar revisão" cria UMA revisão por novidade (id 'rv|nov|<id>'), com desfazer;
   (h) "Abrir no LEGIS" pelo canal do acervo, com a pílula de volta (Central e Início); edição já
       incorporada abre no JURIS; informativo novo não ganha botão de acervo;
   (i) Início, no desenho acordado com a sessão "Interface de atualização oficial": section com a
       saúde das três fontes no vocabulário único, três contadores, "Detecção automática,
       publicação assistida.", até três leis não conferidas e #ct-of-abrir; aparece SEMPRE na
       área jurídica (sem varredura, "Nunca consultada"); "Já vi" tira o item; o bloco da semana
       diz o recorte e quantas edições aguardam o acervo (E16);
   (j) busca ao vivo: nada sai sem clique; UMA fonte por pedido, as três em paralelo, cada pedido
       com endereço próprio (o service worker real nunca devolve o clique anterior sem rede);
       sucesso, 401, 500, parcial (lacuna: fora de "com sucesso", com "Tentar de novo"), rede
       caída, JSON inválido e resultado guardado no servidor — falha NUNCA vira "nenhuma
       novidade"; o último sucesso (do pacote OU de uma busca anterior) fica depois de uma falha;
   (k) toque: tudo ≥ 44 px (iPad retrato e iPhone), e a 390 px nada rola de lado;
   (l) área: em Saúde a Central não abre, o item some do menu e o resumo do Início também;
   (n) Fase 2 (temas e súmulas): os tipos novos com rótulo próprio, a situação de CADA coleção no
       cartão da fonte (com o erro da que falhou), o filtro de coleção, a tese antes/depois, as
       datas oficiais e "Abrir no JURIS" com o título do verbete ("Tema 1234 (RG)") e a origem;
       contraste medido e 44 px no toque;
   (m) vocabulário e estado únicos: "No acervo" diz onde (LEGIS/JURIS), parcial vence o
       incorporado, "Marcar como conferido" grava st:'conferido', "Manter em revisão" volta a
       'lida'; _novidEstado/_novidMarcar existem; estado vazio com lacuna nunca diz "Nenhuma
       mudança registrada".
   Semeia por base+'/__semente' (404 na mesma origem) e fixa o relógio (page.clock.install, padrão
   de tests/registro-sessao.mjs). Só origem http: page.route não intercepta file://. */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOSTS_OFICIAIS = /^(www\.)?(planalto\.gov\.br|stf\.jus\.br|portal\.stf\.jus\.br|stj\.jus\.br|processo\.stj\.jus\.br)$/;
const URL_CDC = 'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm';
const DIRECOES = ['sutil', 'premium', 'clean', 'moderno', 'aurora', 'solar', 'terminal', 'holo'];
const FRASE_DONA = 'Atualização assistida: o sentinela detecta e propõe; item marcado para revisão só entra no acervo depois de conferido na fonte oficial.';
const FRASE_INICIO = 'Detecção automática, publicação assistida.';

/** O sw.js REAL (ramo de produção) num vm, com caches/fetch falsos: o primeiro pedido passa com
 *  rede; o segundo, com a rede caída. Devolve o que o worker respondeu a cada um. Na web
 *  publicada o worker é network-first e guarda toda resposta GET da mesma origem: o mesmo
 *  endereço sem rede voltaria com a resposta ANTIGA (200, "sem novidade"). */
async function swSemRede(urls) {
  const src = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  const store = new Map();
  const cacheObj = (nome) => ({ match: async (req) => { const r = store.get(nome + '|' + (typeof req === 'string' ? req : req.url)); return r ? r.clone() : undefined; },
    put: async (req, res) => { store.set(nome + '|' + req.url, res); }, keys: async () => [], delete: async () => true, addAll: async () => {} });
  const caches = { open: async (n) => cacheObj(n), keys: async () => [], delete: async () => true, match: async () => undefined };
  const ouvintes = {}; let rede = 'ok';
  const self = { location: new URL('https://catedra.exemplo.app/sw.js'), addEventListener: (t, f) => { (ouvintes[t] = ouvintes[t] || []).push(f); },
    clients: { matchAll: async () => [], claim: async () => {} }, registration: { unregister: async () => {} }, skipWaiting: () => {} };
  const fetchFalso = async () => { if (rede === 'caiu') throw new TypeError('Failed to fetch');
    return new Response(JSON.stringify({ ok: true, fontes: { stf: { resultado: 'sem-novidade', ultimaTentativa: 'RESPOSTA-ANTIGA' } } }),
      { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }); };
  const ctx = { self, caches, fetch: fetchFalso, URL, Request, Response, Promise, console, setTimeout, clearTimeout, navigator: {}, indexedDB: undefined };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  const pedir = async (u) => {
    let p = null; const req = new Request(new URL(u, 'https://catedra.exemplo.app/').href, { headers: { authorization: 'Bearer x' } });
    const ev = { request: req, respondWith: (x) => { p = Promise.resolve(x); }, waitUntil: () => {} };
    for (const f of (ouvintes.fetch || [])) f(ev);
    if (!p) return { status: 'direto', corpo: '' };   // o worker não intercepta: vai à rede (e falha)
    const r = await p; await new Promise((x) => setTimeout(x, 30)); return { status: r.status, corpo: await r.text() };
  };
  const r1 = await pedir(urls[0]); rede = 'caiu'; const r2 = await pedir(urls[1]);
  return { handlers: (ouvintes.fetch || []).length, r1, r2 };
}

/** O pacote semeado: uma fonte de cada estado e um item de cada tipo. */
function fixture(agora) {
  const iso = (deltaMs) => new Date(agora.getTime() + deltaMs).toISOString();
  const H = 3600e3, D = 24 * H;
  return {
    geradoEm: iso(-2 * H),
    fontes: {
      planalto: { rotulo: 'Planalto — texto compilado das normas', monitora: 'o texto compilado das normas do LEGIS, artigo a artigo',
        limites: ['LIMITE-ISCA-1 só as 14 normas', 'LIMITE-ISCA-2 não descobre normas novas'],
        normas: [{ sigla: 'CDC', nome: 'Código de Defesa do Consumidor' }, { sigla: 'CP', nome: 'Código Penal' }],
        ultimaTentativa: iso(-2 * H), ultimoSucesso: iso(-2 * H), resultado: 'novidades', erro: null, detalhe: '14/14 normas lidas' },
      stf: { rotulo: 'STF — Informativo de Jurisprudência', monitora: 'edições novas do Informativo',
        limites: ['súmulas e temas de repercussão geral não são monitorados'], ultimaTentativa: iso(-2 * H), ultimoSucesso: iso(-2 * H),
        resultado: 'sem-novidade', erro: null, detalhe: 'a partir da edição 1230' },
      stj: { rotulo: 'STJ — Informativo de Jurisprudência', monitora: 'edições novas do Informativo',
        limites: ['SCON bloqueado; BDJur ainda não integrado', 'temas repetitivos fora desta versão'],
        ultimaTentativa: iso(-2 * H), ultimoSucesso: iso(-9 * D), resultado: 'falha', erro: 'ERRO-ISCA-503 do portal do STJ', detalhe: '' },
    },
    itens: [
      { id: 'nv-alt', fonte: 'planalto', tipo: 'alteracao', norma: 'CDC', normaNome: 'Código de Defesa do Consumidor', disp: 'Art. 12',
        titulo: 'Art. 12 — CDC', antes: 'Art. 12. ANTES-ISCA texto anterior do dispositivo.',
        depois: 'Art. 12. DEPOIS-ISCA texto novo do dispositivo. (Redação dada pela Lei nº 15.999, de 2026)',
        modificadora: 'Lei nº 15.999, de 2026', vigencia: 'aguardando', vigenciaEm: '01/12/2026', vigenciaMotivo: 'a página traz data futura', revisar: false,
        urlOficial: URL_CDC, detectadoEm: iso(-1 * D) },
      { id: 'nv-inc', fonte: 'planalto', tipo: 'inclusao', norma: 'CDC', normaNome: 'Código de Defesa do Consumidor', disp: 'Art. 12-A',
        titulo: 'Art. 12-A — CDC', antes: null,
        // palavra longa de propósito: a 390 px ela não pode empurrar a tela de lado
        depois: 'Art. 12-A. https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/L15999compilado-palavra-sem-espaco-nenhum.htm texto incluído.',
        modificadora: 'Lei nº 15.999, de 2026', vigencia: 'em-vigor', efeitos: 'marcador-proprio', efeitosEm: null, revisar: true,
        urlOficial: URL_CDC, detectadoEm: iso(-20 * D) },
      // revogação como o motor a produz: o artigo CONTINUA no texto compilado, com a anotação no caput
      { id: 'nv-rev', fonte: 'planalto', tipo: 'revogacao', norma: 'CP', normaNome: 'Código Penal', disp: 'Art. 9',
        titulo: 'Art. 9 — CP', antes: 'Art. 9. texto anterior.', depois: 'Art. 9. (Revogado pela Lei nº 15.240, de 2026)', modificadora: 'Lei nº 15.240, de 2026',
        vigencia: 'em-vigor', revisar: true,
        // http (sem s): a lista de permissão não deixa virar link
        urlOficial: 'http://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm', detectadoEm: iso(-60 * D) },
      { id: 'nv-inf', fonte: 'stf', tipo: 'informativo', norma: 'STF', normaNome: 'STF — Informativo', disp: 'Informativo 1230 do STF',
        titulo: 'Informativo 1230 do STF', antes: null, depois: null, vigencia: 'em-vigor', revisar: true,
        pendencia: 'edição detectada na fonte oficial', urlOficial: 'https://www.stf.jus.br/arquivo/informativo/documento/informativo1230.htm',
        detectadoEm: iso(-3 * D) },
      { id: 'INF-STJ-900', fonte: 'stj', tipo: 'informativo', norma: 'STJ', normaNome: 'STJ — Informativo', disp: 'Informativo 900 do STJ',
        titulo: 'Informativo 900 do STJ', antes: null, depois: null, vigencia: 'em-vigor', revisar: false, incorporado: true,
        urlOficial: 'https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisarumaedicao&livre=%270900%27.cod.',
        detectadoEm: iso(-40 * D) },
    ],
  };
}

/** Resposta de /api/sentinela para UMA fonte, no formato de api/sentinela.js. */
function respostaApi(agora, f, { falha = false, parcial = false, itens = [], doCache = false } = {}) {
  const est = falha
    ? { rotulo: f, resultado: 'falha', erro: 'ERRO-VIVO-' + f, ultimaTentativa: agora.toISOString(), ultimoSucesso: null }
    : { rotulo: f, resultado: parcial ? 'parcial' : (itens.length ? 'novidades' : 'sem-novidade'), erro: parcial ? 'uma norma não respondeu' : null,
        ultimaTentativa: agora.toISOString(), ultimoSucesso: agora.toISOString(), doCache, ...(doCache ? { consultadoHa: 300 } : {}) };
  const novos = itens.filter((i) => i.novo);
  return { ok: !falha, geradoEm: agora.toISOString(), fontes: { [f]: est }, itens: itens.map(({ novo, ...i }) => i),
    resumo: { novidades: novos.length, encontradas: itens.length, exigemRevisao: itens.filter((i) => i.revisar).length,
      fontesOk: falha ? [] : [f], fontesComFalha: falha ? [f] : [], fontesParciais: parcial ? [f] : [] } };
}

/* ---------- medidas que rodam na página ---------- */
function instalarMedidas() {
  /** resolve qualquer cor CSS (rgb, color-mix, color(srgb…)) por uma sonda do documento */
  const sonda = (s) => { let p = document.getElementById('__nv-sonda');
    if (!p) { p = document.createElement('i'); p.id = '__nv-sonda'; p.style.display = 'none'; document.body.appendChild(p); }
    p.style.color = ''; p.style.color = s; const c = getComputedStyle(p).color;
    let m = /rgba?\(([^)]+)\)/.exec(c); if (m) { const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return v.length > 3 ? v : v.concat([1]); }
    m = /color\(srgb\s+([^)]+)\)/.exec(c); if (m) { const v = m[1].split(/[\s/]+/).filter(Boolean).map(Number); return [v[0] * 255, v[1] * 255, v[2] * 255, v.length > 3 ? v[3] : 1]; }
    return null; };
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const topo = (s) => { const o = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { o.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) o.push(cur.trim()); return o; };
  const comp = (cima, baixo) => [0, 1, 2].map((i) => cima[i] * cima[3] + baixo[i] * (1 - cima[3])).concat([1]);
  /** a cor de um gradiente linear NO PONTO (x, y) da caixa — é o que fica atrás daquele pedaço
   *  de texto (a régua de tests/contraste-destaque.mjs também mede onde o texto está) */
  const corNoPonto = (args, caixa, x, y) => {
    let ang = 180; const partes = topo(args);
    if (/^[-\d.]+(deg|turn|rad)$/.test(partes[0])) { const v = parseFloat(partes[0]); ang = /turn/.test(partes[0]) ? v * 360 : (/rad/.test(partes[0]) ? v * 180 / Math.PI : v); partes.shift(); }
    else if (/^to /.test(partes[0])) { const d = partes.shift(); ang = { 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270, 'to top right': 45, 'to right top': 45, 'to bottom right': 135, 'to right bottom': 135, 'to bottom left': 225, 'to left bottom': 225, 'to top left': 315, 'to left top': 315 }[d] ?? 180; }
    if (/^in /.test(partes[0] || '')) partes.shift();
    const st = partes.map((a) => { const m = /^(.*?)(?:\s+([-\d.]+)%)?$/.exec(a); return { c: sonda(m[1]), p: m[2] != null ? +m[2] / 100 : null }; }).filter((s) => s.c);
    if (!st.length) return null;
    st.forEach((s, i) => { if (s.p == null) s.p = st.length === 1 ? 0 : i / (st.length - 1); });
    const r = ang * Math.PI / 180, sx = Math.sin(r), sy = -Math.cos(r);
    const L = Math.abs(caixa.width * sx) + Math.abs(caixa.height * sy) || 1;
    const t = 0.5 + ((x - (caixa.left + caixa.width / 2)) * sx + (y - (caixa.top + caixa.height / 2)) * sy) / L;
    if (t <= st[0].p) return st[0].c;
    for (let i = 1; i < st.length; i++) if (t <= st[i].p) { const a = st[i - 1], b = st[i], k = (t - a.p) / ((b.p - a.p) || 1); return [0, 1, 2, 3].map((j) => a.c[j] + (b.c[j] - a.c[j]) * k); }
    return st[st.length - 1].c;
  };
  /** os fundos atrás de um elemento: sobe compondo camadas translúcidas até uma sólida ou um
   *  gradiente linear — aí vale a cor do gradiente nos cantos e no centro da caixa do texto */
  const fundos = (el, rr) => {
    const camadas = [];
    rr = rr || el.getBoundingClientRect();
    const pontos = [[rr.left, rr.top], [rr.right, rr.top], [rr.left, rr.bottom], [rr.right, rr.bottom], [(rr.left + rr.right) / 2, (rr.top + rr.bottom) / 2]];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const bi = cs.backgroundImage;
      const bc = sonda(cs.backgroundColor);
      if (bc && bc[3] > 0.99) { camadas.push(bc); return [camadas.reduceRight((acc, c) => comp(c, acc))]; }
      const lin = bi && bi !== 'none' && /^linear-gradient\((.*)\)\s*$/s.exec(bi.trim());
      if (lin) {
        const caixa = e.getBoundingClientRect();
        const cores = pontos.map(([x, y]) => corNoPonto(lin[1], caixa, x, y)).filter(Boolean).map((c) => (c[3] < 1 ? comp(c, bc && bc[3] > 0 ? bc : [255, 255, 255, 1]) : c));
        if (cores.length) return cores.map((p) => camadas.reduceRight((acc, c) => comp(c, acc), p));
      }
      if (bc && bc[3] > 0) camadas.push(bc);
    }
    return [camadas.reduceRight((acc, c) => comp(c, acc), [255, 255, 255, 1])];
  };
  window.__nv = {
    /** pior contraste de texto dentro de `raiz` (folhas com texto próprio, visíveis) */
    contraste(raizSel) {
      const raiz = document.querySelector(raizSel); if (!raiz) return { achou: false };
      // a caixa é a do TEXTO (Range), não a do elemento: um rótulo curto num bloco da largura do
      // hero não fica sobre a ponta clara do gradiente só porque o bloco chega até lá
      const els = new Map();
      const tw = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (!n.textContent.trim() || !n.parentElement) continue;
        const rg = document.createRange(); rg.selectNodeContents(n); const b = rg.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        const u = els.get(n.parentElement);
        els.set(n.parentElement, u ? { left: Math.min(u.left, b.left), top: Math.min(u.top, b.top), right: Math.max(u.right, b.right), bottom: Math.max(u.bottom, b.bottom) }
          : { left: b.left, top: b.top, right: b.right, bottom: b.bottom });
      }
      const medidas = [];
      for (const [el, caixaTexto] of els) {
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        if (el.closest('[disabled],[aria-busy="true"],[aria-hidden="true"]')) continue;
        const fg = sonda(cs.color); if (!fg) continue;
        const pior = Math.min(...fundos(el, caixaTexto).map((p) => cr(fg[3] < 1 ? comp(fg, p) : fg, p)));
        medidas.push({ c: Math.round(pior * 100) / 100, t: el.textContent.trim().slice(0, 34) });
      }
      medidas.sort((x, y) => x.c - y.c);
      return { achou: true, n: medidas.length, pior: medidas[0] || null, abaixo: medidas.filter((m) => m.c < 4.5).slice(0, 4) };
    },
    /** o anel de foco do elemento EM FOCO: a cor do outline contra o fundo que fica em volta
     *  da caixa (fora dela, onde o anel pinta) — para um anel, o piso é 3:1 */
    anel(sel) {
      const el = document.querySelector(sel); if (!el) return { achou: false };
      const cs = getComputedStyle(el), oc = sonda(cs.outlineColor), c = sonda(cs.color);
      const r = el.getBoundingClientRect(), d = (parseFloat(cs.outlineOffset) || 0) + (parseFloat(cs.outlineWidth) || 0) / 2;
      const caixa = { left: r.left - d, top: r.top - d, right: r.right + d, bottom: r.bottom + d };
      const pior = oc ? Math.min(...fundos(el.parentElement, caixa).map((p) => cr(oc, p))) : 0;
      return { achou: true, foco: document.activeElement === el, fv: el.matches(':focus-visible'), estilo: cs.outlineStyle,
        igualTexto: !!oc && !!c && oc.slice(0, 3).every((v, i) => Math.abs(v - c[i]) < 2), c: Math.round(pior * 100) / 100 };
    },
    /** o placeholder de um campo (pseudo-elemento: o TreeWalker não o vê) contra o fundo do campo */
    placeholder(sel) {
      const el = document.querySelector(sel); if (!el) return { achou: false };
      const fg = sonda(getComputedStyle(el, '::placeholder').color); if (!fg) return { achou: true, c: 0 };
      const p = fundos(el)[0];
      return { achou: true, cor: getComputedStyle(el, '::placeholder').color, c: Math.round(cr(fg[3] < 1 ? comp(fg, p) : fg, p) * 100) / 100 };
    },
    /** abre o que a Central esconde atrás de um toque (normas, limites) — para medir tudo */
    abrirTudo() {
      for (const b of document.querySelectorAll('main button[data-acao="detalhe"][aria-expanded="false"]')) b.click();
    },
  };
}

export async function testarNovidadesCentral(pageDaSuite, base, ok, ctxOpc = {}) {
  const motor = ctxOpc.motor || 'chromium';
  const origem = ctxOpc.origem || 'http';
  const R = 'NOVIDADES [' + motor + '] [' + origem + '] ';
  const browser = pageDaSuite.context().browser();
  const agora = (() => { const t = new Date(); t.setHours(14, 0, 0, 0); return t; })();
  const FIX = fixture(agora);

  /* ---------- (a) estático ---------- */
  {
    const ler = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
    const b = ler('scripts/build.mjs'), bm = ler('scripts/build-macos.mjs'), host = ler('Catedra.dc.html'), auth = ler('auth.js'), reg = ler('area-registry.js');
    const copiar = (b.match(/const COPIAR = (\[[^\]]*\]);/) || [])[1] || '';
    const listaMac = (() => { const i = bm.indexOf("for (const f of ['support.js'"); return i < 0 ? '' : bm.slice(i, bm.indexOf(']', i)); })();
    const casca = (() => { const i = b.indexOf('const casca = ['); return i < 0 ? '' : b.slice(i, b.indexOf('];', i)); })();
    ok(/'novidades\.js'/.test(copiar) && /'novidades\.js'/.test(listaMac), R + '(a) novidades.js está nas duas listas de cópia (site e bundle nativo)');
    ok(/'\.\/novidades\.js'/.test(casca), R + '(a) novidades.js está na casca do worker (é <script> do <head>, como o semana-juris.js)');
    ok(/<script src="\.\/novidades\.js"><\/script>/.test(host), R + '(a) o host carrega novidades.js no <head>');
    const auto = (host.match(/_autosaveKeys\(\)\{[^}]*\}/) || [''])[0];
    ok(auto.includes("'novidLidas'"), R + '(a) novidLidas está no _autosaveKeys (persiste e é reidratado pela mesma lista)');
    const areaPropria = (host.match(/AREA_PROPRIA = new Set\(\[[\s\S]*?\]\)/) || [''])[0];
    ok(!!areaPropria && !areaPropria.includes("'novidLidas'"), R + '(a) novidLidas é GLOBAL (fora de AREA_PROPRIA): ler a mudança da lei vale para toda carreira');
    ok(/'catedra:novidLidas': 1/.test((auth.match(/var ARRAY_ID = \{[^}]*\}/) || [''])[0]), R + '(a) catedra:novidLidas está no ARRAY_ID (união por id entre aparelhos)');
    ok(!/'catedra:novidLidas'/.test((auth.match(/var EXCLUDE = \{[\s\S]*?\};/) || [''])[0]), R + '(a) catedra:novidLidas NÃO está no EXCLUDE (sincroniza)');
    const soTela = ['novidFonte', 'novidTipo', 'novidColecao', 'novidDisc', 'novidRamo', 'novidPeriodo', 'novidAssunto', 'novidBuscando', 'novidBuscandoFontes', 'novidVivo', 'novidResultado', 'novidAberto', 'novidAbertos', 'novidSoNaoLidas'];
    ok(soTela.every((k) => !auto.includes("'" + k + "'")), R + '(a) estado só de tela (filtros, busca, resultado, comparação) fica fora do autosave');
    // o acordo com a sessão "Interface de atualização oficial" (01/10/2026), literal onde é literal
    ok(host.includes('id="ct-of-abrir"') && /oficialPainelAbrir = \(\)=> this\.setState\(\{oficialPainelOpen:true\}\);/.test(host), R+'(a) a Central preserva o acesso à revisão oficial');
    ok(!/<section id="ct-fontes-oficiais"/.test(host), R+'(a) resumo das fontes removido do Início');
    ok(host.includes(FRASE_DONA), R + '(a) a frase da dona está, literal, no template da Central');
    ok(/\n  _novidEstado\(id\)\{/.test(host) && /\n  _novidMarcar\(id, st\)\{/.test(host), R + '(a) o contrato com o painel "Revisão oficial": _novidEstado(id) e _novidMarcar(id, st)');
    ok(/novidades:\s*'jurisprudencia'/.test((reg.match(/var VIEW_EXIGE = \{[\s\S]*?\};/) || [''])[0]), R + '(a) VIEW_EXIGE: a Central exige jurisprudência (deep link e paleta passam pelo guarda)');
    ok(/VIEWS_VOLTA = \[[^\]]*'novidades'/.test(host) && /case 'novidades': return 'Voltar à Central de novidades';/.test(host),
      R + '(a) a Central é destino de volta do acervo (VIEWS_VOLTA + rótulo)');
    // o trecho inserido não leva cor fixa: tokens sempre
    const trechos = [];
    const entre = (ini, fim) => { const i = host.indexOf(ini); const j = i < 0 ? -1 : host.indexOf(fim, i + ini.length); if (i >= 0 && j > i) trechos.push(host.slice(i, j)); return i >= 0 && j > i; };
    const achou = [
      entre('<!-- ═══════════ CENTRAL DE NOVIDADES', '<!-- ================= CONQUISTAS ================= -->'),
      entre('// ===== CENTRAL DE NOVIDADES — fontes oficiais', '  redReset = '),
      entre('// ─────────── FONTES OFICIAIS: o leve, sempre', '// O QUE MUDOU ESTA SEMANA (item 7): marcados primeiro'),
    ];
    ok(achou.every(Boolean), R + '(a) os três trechos preservados da Central foram localizados para a varredura (' + achou.join(', ') + ')');
    const sujos = trechos.flatMap((t) => [...t.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(|var\(--[\w-]+\s*,\s*#/g)].map((m) => m[0]));
    ok(sujos.length === 0, R + '(a) o trecho da Central não tem cor fixa (#hex, rgba() literal, var(--x,#hex)) — ' + (sujos.slice(0, 4).join(' ') || 'nenhuma'));
  }

  /** contexto com relógio fixo, semente e o pacote de novidades trocado pela fixture */
  async function abrir({ viewport = { width: 1280, height: 900 }, toque = false, area = 'juridica', lidas = null, pacote = FIX, extra = null } = {}) {
    const c = await browser.newContext({ viewport, hasTouch: toque, isMobile: false });
    const page = await c.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e && e.message || e)));
    await page.clock.install({ time: agora });
    // registrada DEPOIS da rota do harness: tem precedência (o harness só pega o que é de fora)
    await c.route('**/novidades.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8',
      body: '/* fixture */\nwindow.CT_NOVIDADES = ' + JSON.stringify(pacote) + ';' }));
    const pedidosApi = [];
    await c.route('**/api/sentinela**', (r) => { pedidosApi.push(r.request().url()); return r.fulfill({ status: 599, body: 'sem roteiro' }); });
    await page.goto(base + '/__semente');
    await page.evaluate(({ area, lidas, extra, URL_CDC }) => {
      localStorage.clear();
      const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
      set('auth', '1'); set('onboarded', '1'); set('aceite', { termos: 1, privacidade: 1, ts: Date.now() });
      set('areaEstudo', JSON.stringify(area));
      set('edital', [{ disc: 'Direito do Consumidor', peso: 2, questoes: 10, topics: [{ name: 'Responsabilidade pelo fato do produto (CDC)', done: false }, { name: 'Práticas abusivas', done: false }] },
        // dois tópicos que citam códigos pelo NOME: o do Código Penal casa; o do Código Penal Militar, não
        { disc: 'Direito Processual Civil', peso: 2, questoes: 10, topics: [{ name: 'Recurso especial (CPC)', done: false },
          { name: 'Crimes contra a vida no Código Penal', done: false }, { name: 'Crimes propriamente militares no Código Penal Militar', done: false }] }]);
      set('leituras', [{ id: 'la|' + URL_CDC + '|12', leiId: URL_CDC, rot: 'Art. 12', el: {}, nao: [], up: Date.now() }]);
      if (lidas) set('novidLidas', lidas);
      if (extra) for (const [k, v] of Object.entries(extra)) set(k, v);
    }, { area, lidas, extra, URL_CDC });
    await page.goto(base + '/Catedra.dc.html');
    await page.waitForFunction(() => !!window.__catedraApp && typeof window.__catedraGoView === 'function', null, { timeout: 30000 });
    if (toque) {
      await page.waitForFunction(() => !!document.querySelector('[data-toque]'), null, { timeout: 20000 }).catch(() => {});
      await page.evaluate(() => { const a = window.__catedraApp; if (!a._toque) { a._toque = true; a.setState({}); } });
    }
    await page.evaluate(instalarMedidas);
    await page.waitForTimeout(900);
    return { c, page, erros, pedidosApi };
  }
  const ir = (page, v) => page.evaluate((v) => new Promise((r) => { window.__catedraGoView(v); setTimeout(r, 700); }), v);
  const tema = (page, dir, escuro) => page.evaluate(({ dir, escuro }) => new Promise((r) => { const app = window.__catedraApp;
    app.setState({ dir, darkMode: escuro, accent: null }, () => { try { app._temaBroadcast(); } catch (_) {} setTimeout(r, 450); }); }), { dir, escuro });
  // 450 ms: os botões do sistema fazem transição de cor (.14 s) — medir antes dela mede a cor do tema ANTERIOR
  const clicar = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
  const itensNaTela = (page) => page.evaluate(() => [...document.querySelectorAll('[data-novid-item]')].map((e) => e.getAttribute('data-novid-item')));

  /* ---------- (b)…(h) mouse 1280 ---------- */
  {
    const { c, page, erros, pedidosApi } = await abrir({ lidas: [{ id: 'nv-inf', up: agora.getTime() - 3600e3 }] });
    try {
      await ir(page, 'novidades');
      await page.waitForTimeout(1300);
      ok(pedidosApi.length === 0, R + '(j) abrir a Central não chama /api/sentinela sozinho (' + pedidosApi.length + ' pedidos)');
      const b = await page.evaluate(() => {
        const txt = (s) => ((document.querySelector(s) || {}).innerText || '');
        const app = window.__catedraApp;
        return { view: app.state.view, cur: (document.querySelector('aside button[data-view="novidades"]') || {}).getAttribute?.('aria-current') || '',
          fontes: ['planalto', 'stf', 'stj'].map((f) => ({ f, t: txt('[data-novid-fonte="' + f + '"]') })),
          itens: [...document.querySelectorAll('[data-novid-item]')].map((e) => e.getAttribute('data-novid-item')),
          sucessoStj: app._novidDataExtenso(window.CT_NOVIDADES.fontes.stj.ultimoSucesso),
          hero: txt('main .ct-hero'), titulo: txt('.ct-topbar') };
      });
      ok(b.view === 'novidades' && b.cur === 'page', R + '(b) a Central abre e o item do menu diz que é a tela atual (view=' + b.view + ', aria-current=' + b.cur + ')');
      const fp = b.fontes[0].t, fs_ = b.fontes[1].t, fj = b.fontes[2].t;
      // compacto: normas e limites abrem com um toque, e o rótulo já diz quantos são
      ok(/não cobre · 2 pontos/.test(fp) && /não cobre · 2 pontos/.test(fj) && /não cobre · 1 ponto\b/.test(fs_) && /Ver as 2 normas monitoradas/.test(fp) && !/LIMITE-ISCA-1/.test(fp),
        R + '(b) fontes compactas: os limites e as normas ficam atrás de um toque, com a contagem no rótulo');
      await page.evaluate(() => window.__nv.abrirTudo()); await page.waitForTimeout(350);
      const ab = await page.evaluate(() => {
        const txt = (s) => ((document.querySelector(s) || {}).innerText || '');
        const bs = [...document.querySelectorAll('main button[data-acao="detalhe"]')];
        return { fp: txt('[data-novid-fonte="planalto"]'), fj: txt('[data-novid-fonte="stj"]'), n: bs.length,
          ctl: bs.every((b) => b.getAttribute('aria-expanded') === 'true' && !!document.getElementById(b.getAttribute('aria-controls'))),
          altura: [...document.querySelectorAll('[data-novid-fonte]')].map((e) => Math.round(e.getBoundingClientRect().height)) };
      });
      ok(ab.n === 4 && ab.ctl, R + '(b) cada botão de detalhe abre a região que ele controla (aria-expanded=true, aria-controls existe; ' + ab.n + ' botões)');
      ok(/artigo a artigo/.test(ab.fp) && /LIMITE-ISCA-1/.test(ab.fp) && /LIMITE-ISCA-2/.test(ab.fp), R + '(b) Planalto: diz o que monitora e TODOS os limites');
      ok(/CDC/.test(ab.fp) && /Código Penal/.test(ab.fp), R + '(b) Planalto: lista as normas conferidas');
      ok(/Última tentativa/.test(fj) && /Última consulta bem-sucedida/.test(fj) && fj.includes(b.sucessoStj) && / de 20\d\d/.test(fj),
        R + '(b) STJ: as duas datas por extenso, com o último sucesso de 9 dias atrás (' + b.sucessoStj + ')');
      ok(/ERRO-ISCA-503/.test(fj) && /Falhou/.test(fj), R + '(b) STJ em falha mostra o erro por extenso e o selo "Falhou" (vocabulário único)');
      ok(!/nenhuma novidade|sem novidade/i.test(fj), R + '(b) STJ em falha nunca aparece como "nenhuma novidade"');
      ok(/Sem novidade/.test(fs_) && /Detectado/.test(fp) && /SCON|repetitivos/.test(ab.fj), R + '(b) STF "Sem novidade", Planalto "Detectado"; o STJ lista os próprios limites');
      ok(b.itens.length === 5, R + '(b) os cinco itens do pacote pintam (' + b.itens.join(', ') + ')');
      ok(/5[\s\S]*no total/i.test(b.hero) && /4[\s\S]*não lidas/i.test(b.hero) && /4[\s\S]*a conferir/i.test(b.hero),
        R + '(b) o hero conta o total, as não lidas e as a conferir (' + b.hero.replace(/\s+/g, ' ').slice(0, 260) + ')');
      ok(b.hero.includes(FRASE_DONA), R + '(b) a frase da dona aparece, literal, no topo da Central');

      // selos e textos de cada item
      const sel = await page.evaluate(() => {
        const t = (id) => ((document.querySelector('[data-novid-item="' + id + '"]') || {}).innerText || '');
        return { alt: t('nv-alt'), inc: t('nv-inc'), rev: t('nv-rev'), inf: t('nv-inf'), stj: t('INF-STJ-900') };
      });
      ok(/aguardando vigência/i.test(sel.alt) && /Lei nº 15\.999/.test(sel.alt) && /01\/12\/2026/.test(sel.alt),
        R + '(b) alteração em vacatio: "publicada — aguardando vigência", a norma modificadora e a data');
      ok(/efeitos em data própria/i.test(sel.inc) && /\bConferir\b/.test(sel.inc), R + '(b) produção de efeitos em data própria aparece separada da vigência (E10), e o item pede conferência ("Conferir")');
      ok(/No acervo · já no JURIS/.test(sel.stj) && !/\bConferir\b/.test(sel.stj), R + '(b) edição já incorporada: "No acervo · já no JURIS", fora de "Conferir"');
      ok(/\blida\b/.test(sel.inf) && /edição detectada/.test(sel.inf) && /\bConferir\b/.test(sel.inf), R + '(b) o informativo lido diz que foi lido, mostra a pendência e continua a conferir (lida não é conferida)');
      ok(/\bDetectado\b/.test(sel.alt), R + '(b) item sem pendência sai "Detectado" (vocabulário único)');
      ok(/Revogado no texto compilado/.test(sel.rev) && /Revogado pela/.test(sel.rev) && !/renumerad|saiu do texto/i.test(sel.rev),
        R + '(b) revogação dita como o motor a vê: anotada no caput, e o artigo continua no texto (nada de "saiu do texto… renumerado")');

      // contraste no claro
      const k1 = await page.evaluate(() => window.__nv.contraste('main'));
      ok(k1.achou && k1.n > 40 && k1.pior && k1.pior.c >= 4.5, R + '(b) todo texto da Central tem contraste ≥ 4,5:1 no claro, hero incluído (' + k1.n + ' medidos; pior: ' + JSON.stringify(k1.pior) + (k1.abaixo.length ? '; abaixo: ' + JSON.stringify(k1.abaixo) : '') + ')');
      // conteúdos afetados (E6): edital com a sigla em palavra inteira, leitura ativa por URL e artigo
      const af = await page.evaluate(() => {
        const t = (id) => [...document.querySelectorAll('[data-novid-item="' + id + '"] button[data-acao="ir"]')].map((b) => b.textContent.trim());
        return { alt: t('nv-alt'), rev: t('nv-rev') };
      });
      ok(af.alt.some((x) => /^Edital: Responsabilidade pelo fato do produto/.test(x)) && af.alt.some((x) => /^Leitura ativa: 1 dispositivo/.test(x)),
        R + '(b) conteúdos afetados: o tópico do edital que cita a norma e a leitura ativa do artigo (' + af.alt.join(' | ') + ')');
      ok(!af.rev.some((x) => /CPC/.test(x)), R + '(b) "CP" não casa com "CPC": sigla só em palavra inteira (' + (af.rev.join(' | ') || 'nenhum') + ')');
      ok(af.rev.some((x) => /Crimes contra a vida no Código Penal$/.test(x)) && !af.rev.some((x) => /Penal Militar/.test(x)),
        R + '(b) o NOME da norma casa inteiro e sem o nome maior: "Código Penal" aponta o tópico do CP, não o do Código Penal Militar (' + af.rev.join(' | ') + ')');

      // (c) filtros
      const contar = async () => (await itensNaTela(page)).length;
      const filtro = async (campo, valor) => { await clicar(page, 'button[data-campo="' + campo + '"][data-valor="' + valor + '"]'); await page.waitForTimeout(250); };
      await filtro('novidFonte', 'stf');
      const pressed = await page.evaluate(() => document.querySelector('button[data-campo="novidFonte"][data-valor="stf"]').getAttribute('aria-pressed'));
      ok(await contar() === 1 && pressed === 'true', R + '(c) filtro de fonte STF deixa só o informativo do STF, com aria-pressed=true');
      await filtro('novidFonte', 'todas');
      await filtro('novidTipo', 'revogacao'); ok(await contar() === 1, R + '(c) filtro de tipo "Revogações" deixa a revogação'); await filtro('novidTipo', 'todos');
      await filtro('novidDisc', 'Direito do Consumidor'); ok(await contar() === 2, R + '(c) filtro de disciplina (régua da leitura ativa) deixa as duas do CDC');
      await filtro('novidDisc', 'Jurisprudência'); ok(await contar() === 2, R + '(c) os informativos ficam em "Jurisprudência"'); await filtro('novidDisc', 'todas');
      const discChips = await page.evaluate(() => [...document.querySelectorAll('button[data-campo="novidDisc"]')].map((b) => b.textContent.trim()));
      ok(discChips.includes('Direito Penal') && !discChips.some((t) => /^[A-Z][A-Z0-9 .\/-]+$/.test(t)),
        R + '(c) a disciplina nunca sai como sigla crua: o CP (fora do edital, catálogo do LEGIS não carregado) vira "Direito Penal" (' + discChips.join(' | ') + ')');
      await filtro('novidRamo', 'CP'); ok(await contar() === 1, R + '(c) filtro de norma CP deixa só o Código Penal'); await filtro('novidRamo', 'todas');
      await filtro('novidPeriodo', '7'); ok(await contar() === 2, R + '(c) período de 7 dias (relógio fixo) deixa a alteração de ontem e o informativo de 3 dias'); await filtro('novidPeriodo', 'todos');
      await page.fill('main input[type="search"]', 'codigo de defesa');
      await page.waitForTimeout(350);
      ok(await contar() === 2, R + '(c) busca por assunto sem acento ("codigo de defesa") acha o Código de Defesa do Consumidor');
      await page.fill('main input[type="search"]', 'zzz-nada');
      await page.waitForTimeout(350);
      const vazio = await page.evaluate(() => ({ n: document.querySelectorAll('[data-novid-item]').length, t: ((document.querySelector('main .ct-estado') || {}).innerText || ''),
        limpar: !!document.querySelector('main .ct-estado button[data-acao="limpar"]') }));
      ok(vazio.n === 0 && /Nada nesses filtros/.test(vazio.t) && vazio.limpar, R + '(c) filtro sem resultado: estado vazio com título, descrição e "Limpar os filtros"');
      await clicar(page, 'main .ct-estado button[data-acao="limpar"]'); await page.waitForTimeout(300);
      ok(await contar() === 5, R + '(c) "Limpar os filtros" devolve tudo');
      await page.evaluate(() => [...document.querySelectorAll('main button')].find((x) => /só não lidas/i.test(x.textContent || '')).click());
      await page.waitForTimeout(300);
      ok(await contar() === 4, R + '(c) "Só não lidas" tira o informativo semeado como lido');
      await page.evaluate(() => [...document.querySelectorAll('main button')].find((x) => /só não lidas/i.test(x.textContent || '')).click());
      await page.waitForTimeout(250);

      // (d) marcar como lida: [{id, up}], sem duplicar, sobrevive ao reload
      await clicar(page, 'button[data-acao="lida"][data-id="nv-alt"]');
      await page.evaluate(() => window.__catedraApp.novidMarcarLida({ currentTarget: { dataset: { id: 'nv-alt' } } }));
      await page.waitForTimeout(1400);
      const gravado = await page.evaluate(() => JSON.parse(localStorage.getItem('catedra:novidLidas') || '[]'));
      ok(gravado.some((x) => x && x.id === 'nv-alt' && typeof x.up === 'number' && x.st === 'lida') && gravado.every((x) => x && typeof x.id === 'string' && typeof x.up === 'number'),
        R + '(d) "Marcar como lida" grava {id, up, st:\'lida\'} em catedra:novidLidas (' + JSON.stringify(gravado).slice(0, 160) + ')');
      ok(gravado.filter((x) => x.id === 'nv-alt').length === 1, R + '(d) marcar duas vezes não duplica o id');
      await page.reload();
      await page.waitForFunction(() => !!window.__catedraApp, null, { timeout: 30000 });
      await page.evaluate(instalarMedidas);
      await page.waitForTimeout(900);
      const lidasDepois = await page.evaluate(() => (window.__catedraApp.state.novidLidas || []).map((x) => x.id));
      ok(lidasDepois.includes('nv-alt') && lidasDepois.includes('nv-inf'), R + '(d) a leitura sobrevive ao reload (reidratada pelo _autosaveKeys)');
      await ir(page, 'novidades');

      // (e) comparar antes e depois — fechada, nenhum aria-controls aponta para o vazio
      const orfaos = await page.evaluate(() => [...document.querySelectorAll('main button[data-acao="comparar"]')]
        .filter((b) => b.hasAttribute('aria-controls') && !document.getElementById(b.getAttribute('aria-controls'))).map((b) => b.dataset.id));
      ok(orfaos.length === 0, R + '(e) com a comparação fechada, nenhum aria-controls aponta para região inexistente (' + (orfaos.join(', ') || 'nenhum') + ')');
      await clicar(page, 'button[data-acao="comparar"][data-id="nv-alt"]'); await page.waitForTimeout(400);
      const cmp = await page.evaluate(() => {
        const el = document.querySelector('[data-novid-item="nv-alt"]'); const b = el && el.querySelector('button[data-acao="comparar"]');
        const alvo = b && document.getElementById(b.getAttribute('aria-controls'));
        const caixa = (s) => [...(alvo ? alvo.querySelectorAll('*') : [])].find((e) => e.children.length === 0 && (e.textContent || '').includes(s));
        const h = (s) => { const e = caixa(s); return e ? Math.round(e.getBoundingClientRect().height) : 0; };
        return { exp: b && b.getAttribute('aria-expanded'), alvo: !!alvo, hAntes: h('ANTES-ISCA'), hDepois: h('DEPOIS-ISCA') };
      });
      ok(cmp.exp === 'true' && cmp.alvo && cmp.hAntes > 0 && cmp.hDepois > 0, R + '(e) "Comparar antes e depois" pinta as duas versões na região que o botão controla (' + JSON.stringify(cmp) + ')');
      await clicar(page, 'button[data-acao="comparar"][data-id="nv-inc"]'); await page.waitForTimeout(300);
      const inc = await page.evaluate(() => ((document.querySelector('[data-novid-item="nv-inc"]') || {}).innerText || ''));
      ok(/não existia no texto que o app guarda/.test(inc), R + '(e) inclusão: o "antes" diz que o dispositivo não existia');

      // (f) o texto oficial: link de saída, só https oficial
      const of = await page.evaluate(() => {
        const a = document.querySelector('a[data-acao="oficial"][data-id="nv-alt"]');
        const svg = a && a.querySelector('svg');
        const desc = a && document.getElementById(a.getAttribute('aria-describedby') || '');
        return { href: a && a.href, target: a && a.target, rel: a && a.rel, temRev: !!document.querySelector('a[data-acao="oficial"][data-id="nv-rev"]'),
          novaJanela: !!a && /\(abre em nova janela\)/.test(a.textContent || ''), descr: desc ? desc.textContent.trim() : '',
          ico: svg ? { w: svg.getAttribute('width'), h: svg.getAttribute('height'), oculto: svg.getAttribute('aria-hidden') } : null };
      });
      let host = ''; try { host = new URL(of.href).hostname; } catch (_) {}
      ok(HOSTS_OFICIAIS.test(host) && /^https:/.test(of.href) && of.target === '_blank' && /noopener/.test(of.rel) && /noreferrer/.test(of.rel),
        R + '(f) "Abrir o texto oficial" é um link https para a fonte oficial, em janela nova, com noopener noreferrer (' + JSON.stringify(of) + ')');
      ok(!of.temRev, R + '(f) URL fora da lista de permissão (http) não vira link');
      ok(!!of.ico && of.ico.w === '16' && of.ico.oculto === 'true', R + '(f) o ícone de saída é SVG 16 px com aria-hidden');
      ok(of.novaJanela && of.descr === 'Art. 12 — CDC', R + '(f) o link diz ao leitor de tela que abre em nova janela e de qual item é (aria-describedby → título: ' + of.descr + ')');
      const semDono = await page.evaluate(() => [...document.querySelectorAll('[data-novid-item] button[data-acao], [data-novid-item] a[data-acao]')]
        .filter((b) => b.dataset.acao !== 'ir' && !document.getElementById(b.getAttribute('aria-describedby') || '')).map((b) => b.dataset.acao + ':' + b.dataset.id));
      ok(semDono.length === 0, R + '(f) toda ação de um cartão diz de qual item é (aria-describedby → título); sem dono: ' + (semDono.slice(0, 4).join(', ') || 'nenhuma'));

      // (g) agendar revisão: uma por novidade, com desfazer
      await clicar(page, 'button[data-acao="revisao"][data-id="nv-alt"]');
      await page.evaluate(() => window.__catedraApp.novidAgendarRevisao({ currentTarget: { dataset: { id: 'nv-alt' } } }));
      await page.waitForTimeout(300);
      const rv = await page.evaluate(() => {
        const rs = (window.__catedraApp.state.reviews || []).filter((r) => r && r.novidId === 'nv-alt');
        return { n: rs.length, r: rs[0] || null, nota: ((document.querySelector('[data-novid-item="nv-alt"]') || {}).innerText || '').includes('revisão agendada'),
          botao: !!document.querySelector('button[data-acao="revisao"][data-id="nv-alt"]') };
      });
      ok(rv.n === 1 && rv.r && rv.r.id === 'rv|nov|nv-alt' && rv.r.disc === 'Direito do Consumidor' && typeof rv.r.up === 'number' && /^Mudou: /.test(rv.r.topic),
        R + '(g) "Agendar revisão" cria UMA revisão na disciplina certa, com up — dois cliques não duplicam (' + JSON.stringify(rv.r).slice(0, 140) + ')');
      ok(rv.nota && !rv.botao, R + '(g) o cartão passa a dizer "revisão agendada" no lugar do botão');
      const desfez = await page.evaluate(async () => {
        const t = window.__catedraApp._toastAcaoEl; const b = t && [...t.querySelectorAll('button')].find((x) => /desfazer/i.test(x.textContent || ''));
        if (b) b.click(); await new Promise((r) => setTimeout(r, 300));
        return { achou: !!b, n: (window.__catedraApp.state.reviews || []).filter((r) => r && r.novidId === 'nv-alt').length };
      });
      ok(desfez.achou && desfez.n === 0, R + '(g) o "desfazer" do toast tira a revisão (' + JSON.stringify(desfez) + ')');

      // (h) abrir no acervo, com volta à origem
      const acv = await page.evaluate(() => ({ inf: !!document.querySelector('button[data-acao="acervo"][data-id="nv-inf"]'),
        stj: ((document.querySelector('button[data-acao="acervo"][data-id="INF-STJ-900"]') || {}).textContent || '').trim(),
        alt: ((document.querySelector('button[data-acao="acervo"][data-id="nv-alt"]') || {}).textContent || '').trim() }));
      const termos = await page.evaluate(() => ['INF-STJ-EE29', 'INF-STF-1224', 'INF-STJ-900'].map((id) => window.__catedraApp._novidTermoJuris({ id })));
      ok(termos.join(' | ') === 'Info Ed. Extraordinária 29 · STJ | Info 1224 · STF | Info 900 · STJ',
        R + '(h) o termo do JURIS é o título do verbete, também na edição extraordinária (' + termos.join(' | ') + ')');
      ok(!acv.inf && acv.stj === 'Abrir no JURIS' && acv.alt === 'Abrir no LEGIS', R + '(h) informativo novo não ganha botão de acervo; a edição incorporada abre no JURIS; a lei, no LEGIS (' + JSON.stringify(acv) + ')');
      await clicar(page, 'button[data-acao="acervo"][data-id="nv-alt"]');
      await page.waitForFunction(() => window.__catedraApp.state.view === 'legis', null, { timeout: 8000 }).catch(() => {});
      const ida = await page.evaluate(() => { const s = window.__catedraApp.state; return { view: s.view, busca: s.acervoBusca, de: s.acervoDe }; });
      ok(ida.view === 'legis' && ida.busca === 'Código de Defesa do Consumidor' && ida.de && ida.de.view === 'novidades' && ida.de.rotulo === 'Voltar à Central de novidades',
        R + '(h) "Abrir no LEGIS" leva o nome da norma e a origem "Voltar à Central de novidades" (' + JSON.stringify(ida).slice(0, 200) + ')');
      const volta = await page.evaluate(async () => { const a = window.__catedraApp; const r = a._voltarDoAcervo(a.state.acervoDe); await new Promise((x) => setTimeout(x, 500)); return { r, view: a.state.view }; });
      ok(volta.view === 'novidades', R + '(h) a volta do acervo devolve à Central (' + JSON.stringify(volta) + ')');

      // foco pelo teclado: o anel do botão principal do hero acompanha o texto branco e passa de 3:1
      // sobre o gradiente (antes a regra global pintava o anel na cor de destaque SOBRE o destaque)
      const selHero = 'main .ct-hero button[data-acao="buscar"]';
      await page.focus(selHero); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(150);
      const anel0 = await page.evaluate((x) => window.__nv.anel(x), selHero);
      if (motor === 'chromium' || anel0.fv) {
        ok(anel0.foco && anel0.fv && anel0.estilo !== 'none' && anel0.igualTexto && anel0.c >= 3,
          R + '(b) o anel de foco do "Buscar atualizações agora" é a cor do texto e passa de 3:1 sobre o gradiente (' + JSON.stringify(anel0) + ')');
      }
      // as OITO direções, claro e escuro: texto ≥ 4,5:1 (normas e limites abertos) e o anel ≥ 3:1
      await page.evaluate(() => window.__nv.abrirTudo()); await page.waitForTimeout(300);
      const ruins = [], aneis = [];
      for (const dir of DIRECOES) for (const escuro of [false, true]) {
        await tema(page, dir, escuro);
        const k = await page.evaluate(() => window.__nv.contraste('main'));
        if (!k.achou || k.n < 40 || !k.pior || k.pior.c < 4.5) ruins.push(dir + (escuro ? '/escuro ' : '/claro ') + JSON.stringify(k.abaixo && k.abaixo.length ? k.abaixo : k.pior));
        const ph = await page.evaluate(() => window.__nv.placeholder('main input.ct-nv-busca'));
        if (!ph.achou || ph.c < 4.5) ruins.push(dir + (escuro ? '/escuro ' : '/claro ') + 'placeholder da busca ' + JSON.stringify(ph));
        const an = await page.evaluate((x) => window.__nv.anel(x), selHero);
        if (an.foco && an.fv && an.c < 3) aneis.push(dir + (escuro ? '/escuro ' : '/claro ') + an.c);
      }
      ok(ruins.length === 0, R + '(b) todo texto da Central (e o placeholder da busca) tem contraste ≥ 4,5:1 nas oito direções, claro e escuro, hero incluído' + (ruins.length ? ' — abaixo: ' + ruins.slice(0, 4).join(' | ') : ''));
      ok(aneis.length === 0, R + '(b) o anel de foco do botão do hero passa de 3:1 nas oito direções' + (aneis.length ? ' — abaixo: ' + aneis.join(', ') : ''));
      await tema(page, 'sutil', false);

      // O Início enxuto não expõe os resumos; dados e ações seguem na Central.
      await ir(page,'inicio');
      ok(await page.evaluate(()=>!document.querySelector('#ct-fontes-oficiais,#ct-semana,.cth-foco')),R+'(i) resumos removidos do Início');
      const ini=await page.evaluate(()=>{const v=window.__catedraApp.renderVals();return {fontes:v.ofFontes.map(f=>f.nome+' '+f.situacao),ok:String(v.ofContOk),falha:String(v.ofContFalha),conferir:String(v.ofContConferir),itens:v.ofItens.map(x=>x.id)};});
      ok(ini.fontes.join(' | ')==='Planalto Detectado | STF Sem novidade | STJ Falhou',R+'(i) dados das fontes continuam preservados');
      ok(ini.ok==='2'&&ini.falha==='1'&&ini.conferir==='4',R+'(i) contadores das fontes continuam preservados');
      ok(ini.itens.join(',')==='nv-inc,nv-rev',R+'(i) pendências de leis permanecem nos dados');
      await ir(page,'novidades');await page.evaluate(()=>window.__catedraApp.novidLimparFiltros());await page.waitForTimeout(300);
      await clicar(page,'[data-novid-item="nv-rev"] button[data-acao="lida"]');await page.waitForTimeout(400);
      ok(await page.evaluate(()=>window.__catedraApp._novidEstado('nv-rev')==='lida'),R+'(i) marcar como lida continua funcionando na Central');
      await clicar(page,'[data-novid-item="nv-inc"] button[data-acao="acervo"]');
      await page.waitForFunction(()=>window.__catedraApp.state.view==='legis');
      const idaEnxuta=await page.evaluate(()=>{const s=window.__catedraApp.state;return {view:s.view,rot:s.acervoDe&&s.acervoDe.rotulo};});
      ok(idaEnxuta.view==='legis'&&idaEnxuta.rot==='Voltar à Central de novidades',R+'(i) abrir lei preserva volta à Central');
      await page.evaluate(()=>{const a=window.__catedraApp;a._voltarDoAcervo(a.state.acervoDe);});await page.waitForTimeout(500);
      await clicar(page,'#ct-of-abrir');await page.waitForTimeout(400);
      ok(await page.evaluate(()=>window.__catedraApp.state.view==='novidades'&&!!document.getElementById('ct-revisao-oficial')),R+'(i) revisão oficial abre sobre a Central');
      await page.keyboard.press('Escape');await page.waitForTimeout(300);
      ok(pedidosApi.length === 0, R + '(j) nada foi pedido a /api/sentinela sem clique no botão (' + pedidosApi.length + ')');
      ok(!erros.length, R + 'sem erro de página (' + erros.slice(0, 2).join(' | ').slice(0, 160) + ')');
    } finally { await c.close(); }
  }

  /* ---------- (i) sem varredura publicada: o resumo do Início aparece, honesto ---------- */
  {
    const { c, page, erros } = await abrir({ pacote: { geradoEm: null, fontes: {}, itens: [] } });
    try {
      await ir(page, 'inicio');
      const r0=await page.evaluate(()=>{const v=window.__catedraApp.renderVals();return {tem:!!document.querySelector('#ct-fontes-oficiais'),fontes:v.ofFontes.map(f=>f.nome+' '+f.situacao),cont:[v.ofContOk,v.ofContFalha,v.ofContConferir].join('/'),itens:v.ofItens.length};});
      ok(!r0.tem&&r0.fontes.join(' | ')==='Planalto Nunca consultada | STF Nunca consultada | STJ Nunca consultada'&&r0.cont==='0/0/0'&&r0.itens===0,R+'(i) sem varredura: dados honestos preservados, sem resumo no Início');
      await ir(page, 'novidades');
      const v = await page.evaluate(() => ({ t: ((document.querySelector('main .ct-estado') || {}).innerText || ''), btn: !!document.querySelector('main .ct-estado button[data-acao="buscar"]'),
        fontes: ['planalto', 'stf', 'stj'].map((f) => ((document.querySelector('[data-novid-fonte="' + f + '"]') || {}).innerText || '')) }));
      ok(/Nenhuma consulta chegou a este aparelho/.test(v.t) && v.btn && !/nenhuma novidade|Nenhuma mudança registrada/i.test(v.t),
        R + '(b) pacote vazio: o estado vazio diz que não houve consulta e oferece buscar — sem fingir "nenhuma novidade"');
      ok(v.fontes.every((t) => /Nunca consultada/.test(t) && /Última consulta bem-sucedida: nunca/.test(t)), R + '(b) pacote vazio: cada fonte diz "Nunca consultada"');
      // 401 com o pacote vazio: a fonte nem foi consultada — o vazio continua dizendo isso
      await c.unroute('**/api/sentinela**');
      await c.route('**/api/sentinela**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Entre na sua conta do Cátedra para buscar atualizações.' }) }));
      await clicar(page, 'main .ct-hero button[data-acao="buscar"]');
      await page.waitForFunction(() => !window.__catedraApp.state.novidBuscando && !!window.__catedraApp.state.novidResultado, null, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(300);
      const t401 = await page.evaluate(() => ((document.querySelector('main .ct-estado') || {}).innerText || ''));
      ok(/Nenhuma consulta chegou a este aparelho/.test(t401) && !/Nenhuma mudança registrada/.test(t401), R + '(b) depois de um 401 com o pacote vazio, o vazio não vira "Nenhuma mudança registrada" (' + t401.replace(/\s+/g, ' ').slice(0, 90) + ')');
      // lacuna no pacote (parcial ou falha) nunca vira "Nenhuma mudança registrada"; só com as três inteiras
      const H = 3600e3, iso = (d) => new Date(agora.getTime() + d).toISOString();
      const fonteOk = (r) => ({ resultado: r, ultimaTentativa: iso(-H), ultimoSucesso: iso(-H), limites: ['x'] });
      const casos = [
        ['Planalto parcial', { planalto: fonteOk('parcial'), stf: fonteOk('sem-novidade'), stj: fonteOk('sem-novidade') }, /A última consulta não se completou/, /Planalto \(parcial\)/],
        ['STJ falhou', { planalto: fonteOk('sem-novidade'), stf: fonteOk('sem-novidade'), stj: { ...fonteOk('falha'), erro: 'caiu' } }, /A última consulta não se completou/, /STJ \(falhou\)/],
        ['STF nunca consultado', { planalto: fonteOk('sem-novidade'), stf: {}, stj: fonteOk('sem-novidade') }, /A última consulta não se completou/, /STF \(nunca consultada\)/],
        ['as três inteiras', { planalto: fonteOk('sem-novidade'), stf: fonteOk('sem-novidade'), stj: fonteOk('novidades') }, /Nenhuma mudança registrada/, /dentro do que cada fonte cobre/],
      ];
      for (const [nome, fontes, tit, desc] of casos) {
        const t = await page.evaluate((p) => new Promise((r) => { window.CT_NOVIDADES = p;
          window.__catedraApp.setState({ novidVivo: null, novidResultado: null }, () => setTimeout(() => r(((document.querySelector('main .ct-estado') || {}).innerText || '')), 250)); }),
          { geradoEm: iso(-H), fontes, itens: [] });
        ok(tit.test(t) && desc.test(t) && (nome === 'as três inteiras' || !/Nenhuma mudança registrada/.test(t)),
          R + '(b) estado vazio com ' + nome + ': ' + t.replace(/\s+/g, ' ').slice(0, 150));
      }
      ok(!erros.length, R + '(b) pacote vazio: sem erro de página (' + erros.slice(0, 1).join('').slice(0, 120) + ')');
    } finally { await c.close(); }
  }

  /* ---------- (m) vocabulário e estado únicos: No acervo diz onde, parcial vence, conferido ---------- */
  {
    const D = 24 * 3600e3, iso = (d) => new Date(agora.getTime() + d).toISOString();
    const lei = (id, extra) => ({ id, fonte: 'planalto', tipo: 'alteracao', norma: 'CDC', normaNome: 'Código de Defesa do Consumidor', disp: 'Art. 3' + id.length,
      titulo: 'Art. ' + id + ' — CDC', antes: 'antes ' + id, depois: 'depois ' + id, vigencia: 'em-vigor', revisar: false, urlOficial: URL_CDC, detectadoEm: iso(-D), ...extra });
    const P = { ...FIX, itens: [lei('pl-acervo', { incorporado: true, incorporadoTxt: 'já no LEGIS' }), lei('pl-acervo-sem-txt', { incorporado: true }),
      lei('pl-parcial', { incorporado: true, parcial: true, revisar: true }), lei('pl-limpo', { detectadoEm: iso(-2 * D) })] };
    const { c, page, erros } = await abrir({ pacote: P });
    try {
      await ir(page, 'novidades');
      const st = () => page.evaluate(() => {
        const s = (id) => (document.querySelector('[data-novid-item="' + id + '"] [data-selo="status"]') || {}).textContent || '';
        return { acervo: s('pl-acervo'), semTxt: s('pl-acervo-sem-txt'), parcial: s('pl-parcial'), limpo: s('pl-limpo'),
          hero: (document.querySelector('main .ct-hero') || {}).innerText || '',
          botoes: [...document.querySelectorAll('[data-novid-item="pl-limpo"] button[data-acao]')].map((b) => b.dataset.acao).join(','),
          acervoBotoes: [...document.querySelectorAll('[data-novid-item="pl-acervo"] button[data-acao="conferido"]')].length };
      });
      const s1 = await st();
      ok(s1.acervo === 'No acervo · já no LEGIS' && s1.semTxt === 'No acervo · já no LEGIS', R + '(m) lei incorporada diz "No acervo · já no LEGIS" — com o incorporadoTxt do motor e, sem ele, pela fonte (' + s1.acervo + ' / ' + s1.semTxt + ')');
      ok(s1.parcial === 'Parcial' && s1.limpo === 'Detectado' && /2[\s\S]*a conferir/i.test(s1.hero), R + '(m) comparação parcial vence o incorporado e conta em "a conferir" (' + s1.parcial + '; ' + s1.hero.replace(/\s+/g, ' ').slice(-90) + ')');
      ok(s1.acervoBotoes === 0 && /conferido/.test(s1.botoes), R + '(m) "Marcar como conferido" só onde cabe: não no que já está no acervo (' + s1.botoes + ')');
      const contrato = await page.evaluate(() => ({ e: typeof window.__catedraApp._novidEstado, m: typeof window.__catedraApp._novidMarcar }));
      ok(contrato.e === 'function' && contrato.m === 'function', R + '(m) _novidEstado e _novidMarcar existem no componente (contrato com o painel "Revisão oficial")');
      await clicar(page, '[data-novid-item="pl-limpo"] button[data-acao="conferido"]'); await page.waitForTimeout(1400);
      const s2 = await st();
      const g2 = await page.evaluate(() => ({ ls: JSON.parse(localStorage.getItem('catedra:novidLidas') || '[]'), est: window.__catedraApp._novidEstado('pl-limpo') }));
      ok(s2.limpo === 'Conferido' && g2.est === 'conferido' && g2.ls.filter((x) => x.id === 'pl-limpo').length === 1 && g2.ls.find((x) => x.id === 'pl-limpo').st === 'conferido'
        && /1[\s\S]*a conferir/i.test(s2.hero) && !/lida/.test(s2.botoes) && /manter/.test(s2.botoes),
        R + '(m) "Marcar como conferido" grava {id, up, st:\'conferido\'} uma vez, o selo vira "Conferido", sai de "a conferir" e vira "Manter em revisão" (' + JSON.stringify(g2.ls) + ' · ' + s2.botoes + ')');
      await ir(page, 'inicio');
      const i2=await page.evaluate(()=>{const v=window.__catedraApp.renderVals();return {itens:v.ofItens.map(x=>x.id).join(','),conferir:String(v.ofContConferir)};});
      ok(i2.itens==='pl-parcial'&&i2.conferir==='1',R+'(m) marcar conferido continua atualizando pendências');
      await ir(page, 'novidades');
      await clicar(page, '[data-novid-item="pl-limpo"] button[data-acao="manter"]'); await page.waitForTimeout(1400);
      const s3 = await st();
      const g3 = await page.evaluate(() => JSON.parse(localStorage.getItem('catedra:novidLidas') || '[]').find((x) => x.id === 'pl-limpo'));
      ok(s3.limpo === 'Detectado' && g3 && g3.st === 'lida' && /2[\s\S]*a conferir/i.test(s3.hero), R + '(m) "Manter em revisão" volta a marca a \'lida\' e o item a pedir conferência (' + JSON.stringify(g3) + ')');
      await page.reload();
      await page.waitForFunction(() => !!window.__catedraApp, null, { timeout: 30000 });
      await page.waitForTimeout(900);
      ok(await page.evaluate(() => window.__catedraApp._novidEstado('pl-limpo')) === 'lida', R + '(m) a marca sobrevive ao reload');
      ok(!erros.length, R + '(m) sem erro de página (' + erros.slice(0, 1).join('').slice(0, 120) + ')');
    } finally { await c.close(); }
  }

  /* ---------- (j) o service worker da web não devolve um clique antigo sem rede ---------- */
  {
    const { c, page } = await abrir();
    try {
      const urls = await page.evaluate(() => [window.__catedraApp._novidUrlApi('stf'), window.__catedraApp._novidUrlApi('stf')]);
      const sw = await swSemRede(urls);
      const ctl = await swSemRede([urls[0], urls[0]]);
      ok(sw.handlers > 0 && urls[0] !== urls[1] && sw.r1.status === 'direto' && sw.r2.status === 'direto' && ctl.r2.status === 'direto',
        R + '(j) com o sw.js real e a rede caída, o 2º clique NÃO recebe a resposta do 1º (' + JSON.stringify({ r1: sw.r1.status, r2: sw.r2.status }) + '; mesmo endereço daria ' + ctl.r2.status + ')');
    } finally { await c.close(); }
  }

  /* ---------- (j) busca ao vivo: cada desfecho do servidor ---------- */
  const NOVO = { id: 'nv-vivo', fonte: 'planalto', tipo: 'inclusao', norma: 'CDC', normaNome: 'Código de Defesa do Consumidor', disp: 'Art. 12-B',
    titulo: 'Art. 12-B — CDC', depois: 'Art. 12-B. VIVO-ISCA', vigencia: 'em-vigor', revisar: false, urlOficial: URL_CDC, detectadoEm: agora.toISOString(), novo: true };
  const porFonte = (fn) => async (r) => { const f = new URL(r.request().url()).searchParams.get('fonte'); return fn(r, f); };
  const json = (r, corpo, status = 200) => r.fulfill({ status, contentType: 'application/json', body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo) });
  const CENARIOS = [
    ['sucesso', porFonte((r, f) => json(r, respostaApi(agora, f, { itens: f === 'planalto' ? [{ ...FIX.itens[0] }, NOVO] : [] }))),
      (x) => [[/VIVO-ISCA/.test(x.cmpVivo) || x.ids.includes('nv-vivo'), 'o item novo da busca aparece na lista'],
        [x.ids.filter((i) => i === 'nv-alt').length === 1, 'o item que já estava no pacote não duplica (mesmo id)'],
        [/Novidades encontradas: 1/.test(x.res) && /de 2 itens vistos/.test(x.res), 'o resultado separa novidades novas das vistas'],
        [/Fontes consultadas com sucesso: Planalto, STF, STJ/.test(x.res) && /Alterações aplicadas ao acervo: nenhuma/.test(x.res), 'quem respondeu, e que nada foi aplicado ao acervo'],
        [/1 novidade encontrada/.test(x.toast), 'o toast conta a novidade'],
        [/Sem novidade/.test(x.stj) && !/ERRO-ISCA-503/.test(x.stj), 'a fonte que voltou a responder deixa de mostrar o erro antigo'],
        [x.stj.includes(x.sucessoAgora), 'e passa a mostrar o sucesso de agora (' + x.sucessoAgora + ')']]],
    ['401', (r) => json(r, { ok: false, error: 'ISCA-401 Entre na sua conta do Cátedra para buscar atualizações.' }, 401),
      (x) => [[/ISCA-401/.test(x.toast) && /ISCA-401/.test(x.res), 'sem sessão, mostra a frase pronta do servidor (campo error)'],
        [!x.ocupado, 'o botão sai do estado ocupado'], [x.stj.includes(x.sucessoStj) && /ERRO-ISCA-503/.test(x.stj), 'o diário da fonte não muda: ela nem foi consultada'],
        [!/nenhuma novidade|nada de novo/i.test(x.res + ' ' + x.toast), 'e nunca "nenhuma novidade"']]],
    ['500', (r) => r.fulfill({ status: 500, body: 'erro' }),
      (x) => [[/não foi possível consultar/i.test(x.res) && /não dá para dizer se algo mudou/.test(x.res), 'HTTP 500 vira "não foi possível consultar"'],
        [!/nenhuma novidade|nada de novo/i.test(x.res + ' ' + x.toast), 'e nunca "nenhuma novidade"'],
        [x.stj.includes(x.sucessoStj), 'o último sucesso do STJ que o pacote registrou continua depois da falha ao vivo (' + x.sucessoStj + ')'],
        [/Falhou/.test(x.planalto) && x.planalto.includes(x.sucessoPlanalto), 'o Planalto, que falhou agora, mantém o último sucesso do pacote']]],
    ['parcial', porFonte((r, f) => json(r, respostaApi(agora, f, { falha: f === 'stj', parcial: f === 'planalto' }))),
      (x) => [[/Não foi possível consultar: STJ/.test(x.res) && x.tentar === 'stj,planalto', 'a que falhou é nomeada, e o "Tentar de novo" é das duas lacunas — a que falhou e a parcial (' + x.tentar + ')'],
        [/Consulta parcial: Planalto/.test(x.res) && /Fontes consultadas com sucesso: STF\b/.test(x.res) && !/com sucesso: [^\n]*Planalto/.test(x.res),
          'o parcial é dito e NÃO entra em "Fontes consultadas com sucesso"'],
        [!/nenhuma novidade|nada de novo/i.test(x.res + ' ' + x.toast), 'lacuna não vira "nenhuma novidade"']]],
    ['parcial-so', porFonte((r, f) => json(r, respostaApi(agora, f, { parcial: f === 'planalto' }))),
      (x) => [[/Consulta parcial: Planalto/.test(x.res) && /Fontes consultadas com sucesso: STF, STJ/.test(x.res) && x.tentar === 'planalto',
          'só o Planalto parcial: fora de "com sucesso", com "Tentar de novo" dele (' + x.tentar + ')'],
        [!/nada de novo|nenhuma novidade/i.test(x.res + ' ' + x.toast), 'com uma fonte parcial e as outras sem novidade, NUNCA "não trouxeram nada de novo" (' + x.toast + ')'],
        [/Parcial/.test(x.planalto), 'o cartão do Planalto diz "Parcial"']]],
    ['rede', (r) => r.abort('failed'),
      (x) => [[/não foi possível consultar/i.test(x.res + ' ' + x.toast), 'rede caída vira "não foi possível consultar"'], [!x.ocupado, 'o botão volta'],
        [/sem conexão/.test(x.res) && !/Failed to fetch|NetworkError|Load failed/i.test(x.res + ' ' + x.toast + ' ' + x.planalto), 'em português ("sem conexão…"), sem a mensagem crua do navegador']]],
    ['json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'isto não é json' }),
      (x) => [[/não foi possível consultar/i.test(x.res + ' ' + x.toast) && /ilegível/.test(x.res), 'resposta ilegível vira "não foi possível consultar"']]],
    ['cache', porFonte((r, f) => json(r, respostaApi(agora, f, { doCache: f === 'planalto' }))),
      (x) => [[/Resultado guardado no servidor há 5 min/.test(x.planalto), 'a fonte servida do cache diz a idade do resultado'],
        [/Planalto: resultado guardado no servidor há 5 min/.test(x.res), 'e o resultado da consulta também']]],
  ];
  for (const [nome, rota, criterios] of CENARIOS) {
    const { c, page, erros } = await abrir();
    try {
      await c.unroute('**/api/sentinela**');
      const pedidos = [];
      await c.route('**/api/sentinela**', async (r) => { pedidos.push(r.request().url()); await new Promise((x) => setTimeout(x, 350)); return rota(r); });
      await ir(page, 'novidades');
      const x = await page.evaluate(async (agoraIso) => {
        const w = (ms) => new Promise((r) => setTimeout(r, ms));
        const app = window.__catedraApp;
        document.querySelector('main button[data-acao="buscar"][data-fonte="planalto,stf,stj"]').click(); await w(120);
        const b = document.querySelector('main button[data-acao="buscar"][data-fonte="planalto,stf,stj"]');
        const ocupadoNoClique = !!b && b.disabled && b.getAttribute('aria-busy') === 'true' && !!document.querySelector('main .ct-estado-carregando')
          && [...document.querySelectorAll('main button[data-acao="buscar"]')].every((y) => y.disabled);
        for (let i = 0; i < 40 && app.state.novidBuscando; i++) await w(100);
        await w(250);
        const t = (s) => ((document.querySelector(s) || {}).innerText || '');
        const fonte = window.CT_NOVIDADES.fontes;
        return { ocupadoNoClique, ocupado: !!app.state.novidBuscando, toast: (app._toastEl && app._toastEl.textContent) || '',
          res: t('#nv-resultado'), stj: t('[data-novid-fonte="stj"]'), planalto: t('[data-novid-fonte="planalto"]'),
          sucessoStj: app._novidDataExtenso(fonte.stj.ultimoSucesso), sucessoPlanalto: app._novidDataExtenso(fonte.planalto.ultimoSucesso),
          tentar: (document.querySelector('#nv-resultado button[data-acao="tentar"]') || { dataset: {} }).dataset.fonte || '',
          ids: [...document.querySelectorAll('[data-novid-item]')].map((e) => e.getAttribute('data-novid-item')), cmpVivo: t('[data-novid-item="nv-vivo"]'),
          sucessoAgora: app._novidDataExtenso(agoraIso) };
      }, agora.toISOString());
      const fontesPedidas = pedidos.map((u) => new URL(u).searchParams.get('fonte')).sort().join(',');
      ok(pedidos.length === 3 && fontesPedidas === 'planalto,stf,stj', R + '(j) ' + nome + ': UMA fonte por pedido, as três (' + fontesPedidas + ')');
      ok(x.ocupadoNoClique, R + '(j) ' + nome + ': durante a busca os botões ficam desabilitados, o principal com aria-busy, e o andamento aparece');
      ok(new Set(pedidos).size === pedidos.length && pedidos.every((u) => new URL(u).searchParams.get('_')), R + '(j) ' + nome + ': cada pedido tem endereço próprio (o worker não tem cópia de clique anterior para devolver)');
      for (const [cond, msg] of criterios(x)) ok(cond, R + '(j) ' + nome + ': ' + msg);
      if (nome === 'parcial') {
        // "Tentar de novo" repete só a que falhou
        await c.unroute('**/api/sentinela**');
        const p2 = [];
        await c.route('**/api/sentinela**', porFonte((r, f) => { p2.push(f); return json(r, respostaApi(agora, f, {})); }));
        await clicar(page, '#nv-resultado button[data-acao="tentar"]');
        await page.waitForTimeout(900);
        const st = await page.evaluate(() => ((document.querySelector('[data-novid-fonte="stj"]') || {}).innerText || ''));
        ok(p2.slice().sort().join(',') === 'planalto,stj' && /Sem novidade/.test(st), R + '(j) parcial: "Tentar de novo" consulta só as duas lacunas, e o cartão do STJ se atualiza (' + p2.join(',') + ')');
      }
      if (nome === 'sucesso') {
        // sucesso ao vivo e, depois, a rede cai: o sucesso DESTA sessão não pode sumir
        await c.unroute('**/api/sentinela**');
        await c.route('**/api/sentinela**', (r) => r.abort('internetdisconnected'));
        await clicar(page, 'main .ct-hero button[data-acao="buscar"]');
        await page.waitForFunction(() => !window.__catedraApp.state.novidBuscando, null, { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(400);
        const y = await page.evaluate(() => ['planalto', 'stf', 'stj'].map((f) => ((document.querySelector('[data-novid-fonte="' + f + '"]') || {}).innerText || '')));
        ok(y.every((t) => /Falhou/.test(t) && t.includes('Última consulta bem-sucedida: ' + x.sucessoAgora)),
          R + '(j) sucesso ao vivo seguido de rede caída: as três dizem "Falhou" e MANTÊM o último sucesso desta sessão (' + x.sucessoAgora + ')');
      }
      ok(!erros.length, R + '(j) ' + nome + ': sem erro de página (' + erros.slice(0, 1).join('').slice(0, 120) + ')');
    } finally { await c.close(); }
  }

  /* ---------- (k) toque: 44 px, e 390 px sem rolagem lateral ---------- */
  for (const [nome, viewport] of [['iPad retrato 820', { width: 820, height: 1180 }], ['iPhone 390', { width: 390, height: 844 }]]) {
    const { c, page } = await abrir({ viewport, toque: true });
    try {
      await ir(page, 'novidades');
      await clicar(page, 'button[data-acao="comparar"][data-id="nv-inc"]');
      await page.evaluate(() => window.__nv.abrirTudo());
      await page.waitForTimeout(500);
      const m = await page.evaluate(() => {
        const alvos = [...document.querySelectorAll('main button, main a[href], main input')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        const miudos = alvos.map((b) => ({ t: (b.textContent || b.getAttribute('aria-label') || b.tagName).trim().slice(0, 24), h: Math.round(b.getBoundingClientRect().height) })).filter((x) => x.h < 44);
        return { n: alvos.length, miudos, docRola: document.documentElement.scrollWidth - innerWidth,
          scRola: (() => { const s = document.querySelector('main .ct-scroll'); return s ? s.scrollWidth - s.clientWidth : 0; })() };
      });
      ok(m.n > 20 && m.miudos.length === 0, R + '(k) ' + nome + ': todo botão, link e campo da Central mede ≥ 44 px no toque (' + m.n + ' medidos' + (m.miudos.length ? '; miúdos: ' + m.miudos.slice(0, 4).map((x) => x.t + ' ' + x.h).join(', ') : '') + ')');
      ok(m.docRola <= 0 && m.scRola <= 0, R + '(k) ' + nome + ': a tela não rola de lado, nem com a palavra longa aberta na comparação (' + m.docRola + '/' + m.scRola + ' px)');
      const tit = await page.evaluate(() => { const h = document.querySelector('.ct-topbar h1'); return h ? { t: h.textContent.trim(), cabe: h.scrollWidth <= h.clientWidth + 1 } : null; });
      ok(!!tit && tit.cabe, R + '(k) ' + nome + ': o título da barra do topo cabe sem reticências (' + JSON.stringify(tit) + ')');
      // o hero muda de proporção no estreito: o texto cai em outro ponto do gradiente
      for (const escuro of [false, true]) {
        await page.evaluate((d) => new Promise((r) => window.__catedraApp.setState({ darkMode: d }, r)), escuro);
        await page.waitForTimeout(500);
        const k = await page.evaluate(() => window.__nv.contraste('main'));
        ok(k.achou && k.pior && k.pior.c >= 4.5, R + '(k) ' + nome + ': contraste ≥ 4,5:1 ' + (escuro ? 'no escuro' : 'no claro') + ' também nesta largura (pior: ' + JSON.stringify(k.pior) + (k.abaixo.length ? '; abaixo: ' + JSON.stringify(k.abaixo) : '') + ')');
      }
      await page.evaluate(() => new Promise((r) => window.__catedraApp.setState({ darkMode: false }, r)));
      await ir(page, 'inicio');
      const mi=await page.evaluate(()=>({tem:!!document.querySelector('#ct-fontes-oficiais'),docRola:document.documentElement.scrollWidth-innerWidth}));
      ok(!mi.tem&&mi.docRola<=0,R+'(k) '+nome+': Início enxuto sem resumo das fontes e sem rolagem lateral');
    } finally { await c.close(); }
  }

  /* ---------- (n) Fase 2: coleções (repercussão geral, repetitivos, súmulas) ---------- */
  {
    const H = 3600e3, iso = (d) => new Date(agora.getTime() + d).toISOString();
    const P2 = JSON.parse(JSON.stringify(FIX));
    P2.fontes.stf = { ...P2.fontes.stf, rotulo: 'STF — Informativo, repercussão geral e súmulas', resultado: 'parcial',
      colecoes: {
        informativo: { rotulo: 'STF — Informativo de Jurisprudência', rotuloCurto: 'Informativo', resultado: 'sem-novidade', ultimaTentativa: iso(-H), ultimoSucesso: iso(-H), erro: null, detalhe: 'a partir da edição 1231' },
        rg: { rotulo: 'STF — Repercussão geral', rotuloCurto: 'Repercussão geral', resultado: 'novidades', ultimaTentativa: iso(-H), ultimoSucesso: iso(-H), erro: null, detalhe: '1.477 temas lidos' },
        sumulas: { rotulo: 'STF — Súmulas e súmulas vinculantes', rotuloCurto: 'Súmulas', resultado: 'falha', ultimaTentativa: iso(-H), ultimoSucesso: null, erro: 'COLECAO-ERRO-ISCA HTTP 503', detalhe: '' },
      } };
    const tema = { id: 'STF-RG-1234-tese-fixada-abc12345', fonte: 'stf', colecao: 'rg', colecaoRotulo: 'STF — Repercussão geral', tipo: 'tese-fixada', numero: 1234,
      titulo: 'Tema 1234 — STF', disp: 'Tema 1234 — STF', norma: 'STF', normaNome: 'STF — Repercussão geral',
      antes: null, depois: 'TESE-ISCA É constitucional a cobrança prevista na lei.', situacao: 'Mérito julgado', julgadoEm: '18/09/2026', publicadoEm: '30/09/2026',
      acompanhado: true, termoJuris: 'Tema 1234 (RG)', parcial: false, revisar: true,
      pendencia: 'mudança detectada na fonte oficial; o CátedraJURIS ainda mostra o estado anterior — confira na fonte antes de usar. Decisão mais recente não significa, sozinha, superação do entendimento anterior.',
      urlOficial: 'https://portal.stf.jus.br/jurisprudenciaRepercussao/verAndamentoProcesso.asp?incidente=1&numeroTema=1234', detectadoEm: iso(-H) };
    const sum = { id: 'STJ-SUM-677-sumula-nova-def67890', fonte: 'stj', colecao: 'sumulas', colecaoRotulo: 'STJ — Súmulas', tipo: 'sumula-nova', numero: 677,
      titulo: 'Súmula 677 — STJ', disp: 'Súmula 677 — STJ', norma: 'STJ', antes: null, depois: 'SUMULA-ISCA enunciado novo.', aprovadaEm: '24/09/2026',
      acompanhado: false, termoJuris: null, parcial: false, revisar: true, pendencia: 'fora do CátedraJURIS: registrado aqui para você conferir na fonte; não entra no acervo sem revisão',
      urlOficial: 'https://www.stj.jus.br/docs_internet/SumulasSTJ/VerbetesSTJ_asc.pdf', detectadoEm: iso(-2 * H) };
    P2.itens = [...P2.itens, tema, sum];
    const { c, page, erros } = await abrir({ pacote: P2 });
    try {
      await ir(page, 'novidades');
      await page.waitForTimeout(900);
      const n = await page.evaluate(() => {
        const t = (s) => ((document.querySelector(s) || {}).innerText || '');
        const cols = [...document.querySelectorAll('[data-novid-fonte="stf"] [data-novid-colecao]')].map((e) => e.getAttribute('data-novid-colecao') + ':' + e.innerText.replace(/\s+/g, ' ').trim());
        return { tema: t('[data-novid-item="STF-RG-1234-tese-fixada-abc12345"]'), sum: t('[data-novid-item="STJ-SUM-677-sumula-nova-def67890"]'), cols,
          stf: t('[data-novid-fonte="stf"]'), chipsCol: [...document.querySelectorAll('button[data-campo="novidColecao"]')].map((b) => b.textContent.trim()),
          chipsTipo: [...document.querySelectorAll('button[data-campo="novidTipo"]')].map((b) => b.textContent.trim()),
          acvTema: ((document.querySelector('button[data-acao="acervo"][data-id="STF-RG-1234-tese-fixada-abc12345"]') || {}).textContent || '').trim(),
          acvSum: !!document.querySelector('button[data-acao="acervo"][data-id="STJ-SUM-677-sumula-nova-def67890"]') };
      });
      ok(/tese fixada/.test(n.tema) && /Conferir/.test(n.tema) && /Repercussão geral/.test(n.tema) && /julgado em 18\/09\/2026/.test(n.tema) && /acórdão publicado em 30\/09\/2026/.test(n.tema)
        && /Situação na fonte: Mérito julgado/.test(n.tema) && /não significa, sozinha, superação/.test(n.tema),
        R + '(n) tema: o tipo "tese fixada", a coleção, a situação, as datas oficiais e a frase da superação (' + n.tema.replace(/\s+/g, ' ').slice(0, 220) + ')');
      ok(/súmula nova/.test(n.sum) && /aprovada em 24\/09\/2026/.test(n.sum) && !n.acvSum, R + '(n) súmula nova fora do acervo: rótulo, data de aprovação e nenhum "Abrir no JURIS" (o verbete não existe)');
      ok(n.cols.length === 3 && /^informativo:Informativo Sem novidade/.test(n.cols[0]) && /^rg:Repercussão geral Detectado/.test(n.cols[1]) && /^sumulas:Súmulas Falhou COLECAO-ERRO-ISCA HTTP 503/.test(n.cols[2]),
        R + '(n) o cartão do STF mostra a situação de cada coleção, com o erro da que falhou (' + n.cols.join(' | ') + ')');
      ok(/Parcial/.test(n.stf) && !/nenhuma novidade/i.test(n.stf), R + '(n) a fonte com uma coleção em falha fica "Parcial", nunca "sem novidade"');
      ok(n.chipsCol.join(',') === 'Todas,Informativo,Repercussão geral,Súmulas' && n.chipsTipo.includes('Tese fixada') && n.chipsTipo.includes('Súmula nova') && !n.chipsTipo.includes('Modulação'),
        R + '(n) filtros: coleção (só as que têm item) e os tipos novos só quando há item deles (' + n.chipsCol.join(',') + ' / ' + n.chipsTipo.join(',') + ')');
      await clicar(page, 'button[data-campo="novidColecao"][data-valor="rg"]'); await page.waitForTimeout(300);
      const soRg = await itensNaTela(page);
      await clicar(page, 'button[data-campo="novidColecao"][data-valor="todas"]'); await page.waitForTimeout(200);
      await clicar(page, 'button[data-campo="novidTipo"][data-valor="sumula-nova"]'); await page.waitForTimeout(300);
      const soSum = await itensNaTela(page);
      await clicar(page, 'button[data-campo="novidTipo"][data-valor="todos"]'); await page.waitForTimeout(200);
      ok(soRg.join() === 'STF-RG-1234-tese-fixada-abc12345' && soSum.join() === 'STJ-SUM-677-sumula-nova-def67890', R + '(n) o filtro de coleção e o de tipo novo deixam só o item certo (' + soRg.join() + ' / ' + soSum.join() + ')');
      await clicar(page, 'button[data-acao="comparar"][data-id="STF-RG-1234-tese-fixada-abc12345"]'); await page.waitForTimeout(400);
      const cmp = await page.evaluate(() => ((document.getElementById('nv-cmp-STF-RG-1234-tese-fixada-abc12345') || {}).innerText || ''));
      ok(/Sem tese registrada na última leitura oficial/.test(cmp) && /TESE-ISCA/.test(cmp), R + '(n) a comparação mostra a tese antes (nenhuma) e depois (' + cmp.replace(/\s+/g, ' ').slice(0, 140) + ')');
      const k = await page.evaluate(() => window.__nv.contraste('main'));
      ok(k.achou && k.pior && k.pior.c >= 4.5, R + '(n) com as coleções e os tipos novos, todo texto segue ≥ 4,5:1 (pior: ' + JSON.stringify(k.pior) + (k.abaixo.length ? '; abaixo: ' + JSON.stringify(k.abaixo) : '') + ')');
      if (process.env.CT_CAPTURA) {
        await page.locator('[data-novid-fonte="stf"]').screenshot({ path: process.env.CT_CAPTURA + '-fonte.png' }).catch(() => {});
        await page.locator('[data-novid-item="STF-RG-1234-tese-fixada-abc12345"]').screenshot({ path: process.env.CT_CAPTURA + '-tema.png' }).catch(() => {});
      }
      ok(n.acvTema === 'Abrir no JURIS', R + '(n) tema que o acervo acompanha ganha "Abrir no JURIS"');
      await clicar(page, 'button[data-acao="acervo"][data-id="STF-RG-1234-tese-fixada-abc12345"]');
      await page.waitForFunction(() => window.__catedraApp.state.view === 'juris', null, { timeout: 8000 }).catch(() => {});
      const ida = await page.evaluate(() => { const s = window.__catedraApp.state; return { view: s.view, busca: s.acervoBusca, de: s.acervoDe && s.acervoDe.view }; });
      ok(ida.view === 'juris' && ida.busca === 'Tema 1234 (RG)' && ida.de === 'novidades', R + '(n) "Abrir no JURIS" leva o título do verbete e a volta para a Central (' + JSON.stringify(ida) + ')');
      ok(!erros.length, R + '(n) sem erro de página (' + erros.slice(0, 1).join('').slice(0, 120) + ')');
    } finally { await c.close(); }
    // toque: os botões novos (filtro de coleção) medem ≥ 44 px
    const t = await abrir({ pacote: P2, viewport: { width: 390, height: 844 }, toque: true });
    try {
      await ir(t.page, 'novidades');
      const m = await t.page.evaluate(() => { const b = [...document.querySelectorAll('main button[data-campo="novidColecao"], main button[data-campo="novidTipo"]')];
        return { n: b.length, min: Math.min(...b.map((x) => x.getBoundingClientRect().height)), rola: document.documentElement.scrollWidth - innerWidth }; });
      ok(m.n >= 6 && m.min >= 44 && m.rola <= 0, R + '(n) a 390 px no toque, os filtros de coleção e de tipo medem ≥ 44 px e nada rola de lado (' + JSON.stringify(m) + ')');
    } finally { await t.c.close(); }
  }

  /* ---------- (l) área: fora das carreiras com jurisprudência a Central não abre ---------- */
  {
    const { c, page } = await abrir({ area: 'saude' });
    try {
      const v = await page.evaluate(() => new Promise((r) => { window.__catedraGoView('novidades'); setTimeout(() => {
        // "Mais opções" aberto: o irmão Desempenho aparece, e a Central não
        window.__catedraApp.setState({ navExpanded: true }, () => setTimeout(() => r({ view: window.__catedraApp.state.view,
          irmao: !!document.querySelector('aside button[data-view="analise"]'), menu: !!document.querySelector('aside button[data-view="novidades"]') }), 200));
      }, 700); }));
      ok(v.view === 'indisponivel', R + '(l) em Saúde a Central diz por que não abre (view=' + v.view + ')');
      ok(v.irmao && !v.menu, R + '(l) em Saúde, com "Mais opções" aberto, o item "Central de novidades" não aparece no menu (' + JSON.stringify(v) + ')');
      await ir(page, 'inicio');
      ok(!(await page.evaluate(() => !!document.querySelector('#ct-fontes-oficiais'))), R + '(l) em Saúde o resumo das fontes oficiais não aparece no Início');
    } finally { await c.close(); }
  }
}
