/* FORA DO ESCOPO (item 14, 25/11/2026)
   O Cátedra não compete em sentença inédita apostando no próximo edital, correção por
   magistrado, videoaula da correção e ranking de turma. Dos quatro, só o ranking existe no
   código (o ranking semanal por grupo da Comunidade): fica atrás da flag rankingTurma,
   desligada. O resto da Comunidade (sala ao vivo, grupos, mural, o seletor do grupo ativo e o
   desafio coletivo, que não é ranking) continua.
   Parte 1 (Node, sem navegador): a flag e a leitura dela, o portão no template lido como o
   parser do navegador lê, os textos de cada lado da flag, a chave fora do sync e a varredura
   dos outros três recursos. Parte 2 (navegador): a Comunidade MEDIDA sem e com a flag, no
   claro e no escuro, com mouse e no toque do iPad.
   Roda sozinho: node tests/fora-do-escopo.mjs (só a parte 1). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

/* ---------- leitura do template como o parser do navegador ----------
   O support.js monta o template com o parser HTML (tpl.innerHTML). Um </sc-if> que chega com um
   <div> aberto é IGNORADO (fim de tag de elemento comum com elemento especial no topo da pilha) e
   o portão engole o que vem depois, até o </div> que fecha a coluna. Foi o defeito da primeira
   versão deste item: com a flag desligada sumiam também os grupos e o mural. Esta leitura segue a
   mesma regra e devolve, além da árvore, cada fechamento fora do lugar. */
const VAZIOS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const ESPECIAIS = new Set(['address', 'article', 'aside', 'blockquote', 'body', 'button', 'details', 'div', 'dl', 'dd', 'dt', 'fieldset', 'figure', 'footer', 'form',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'html', 'iframe', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'select', 'summary', 'table', 'tbody', 'td',
  'template', 'textarea', 'tfoot', 'th', 'thead', 'tr', 'ul']);
const BLOCOS = /^(div|p|h[1-6]|ul|ol|li|section|article|header|footer|table|form|details|figure|blockquote|pre)$/;
export function lerArvore(trecho) {
  const raiz = { tag: '#raiz', attrs: '', filhos: [], texto: '', pai: null };
  const pilha = [raiz], erros = [];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*)\s*(\/?)>|([^<]+)|</g;
  let m;
  while ((m = re.exec(trecho))) {
    const topo = pilha[pilha.length - 1];
    if (m[0].startsWith('<!--')) continue;
    if (m[5] !== undefined || m[0] === '<') { topo.texto += m[0]; continue; }
    const tag = m[2].toLowerCase();
    if (m[1] !== '/') {
      if (BLOCOS.test(tag) && pilha.some((n) => n.tag === 'p')) erros.push('<' + tag + '> dentro de <p> (o parser fecha o <p> antes)');
      const no = { tag, attrs: m[3] || '', filhos: [], texto: '', pai: topo };
      topo.filhos.push(no);
      if (!VAZIOS.has(tag) && !m[4]) pilha.push(no);
      continue;
    }
    if (topo.tag === tag) { pilha.pop(); continue; }
    erros.push('</' + tag + '> com <' + topo.tag + '> aberto');
    for (let i = pilha.length - 1; i > 0; i--) {
      if (pilha[i].tag === tag) { pilha.length = i; break; }
      if (ESPECIAIS.has(pilha[i].tag)) break;   // o parser ignora o fechamento
    }
  }
  if (pilha.length > 1) erros.push('ficaram abertos: ' + pilha.slice(1).map((n) => n.tag).join(' > '));
  return { raiz, erros };
}
const descer = (no, f, out = []) => { for (const c of no.filhos) { if (f(c)) out.push(c); descer(c, f, out); } return out; };
const portoes = (no) => { const v = []; for (let p = no.pai; p; p = p.pai) if (p.tag === 'sc-if') v.push(((p.attrs.match(/value="\{\{\s*([^}]*?)\s*\}\}"/) || [])[1]) || '?'); return v; };
const naFlag = (no) => portoes(no).includes('flagRankingTurma');

// o template do app (o que fica entre <x-dc> e </x-dc>) e o bloco da Comunidade dentro dele
export function templateDoApp(fonte) {
  const ini = fonte.indexOf('<x-dc'), fim = fonte.lastIndexOf('</x-dc>');
  return ini >= 0 && fim > ini ? fonte.slice(ini, fim) : '';
}
function blocoComunidade(tpl) {
  const ini = tpl.indexOf('<!-- ================= COMUNIDADE');
  const fim = ini < 0 ? -1 : tpl.indexOf('<!-- ================= ', ini + 10);
  return ini >= 0 && fim > ini ? tpl.slice(ini, fim) : '';
}

// a regra de sync do auth.js, executada (não lida): isData e chaveDaConta saem do arquivo
function regrasDoSync(auth) {
  const isData = (auth.match(/function isData\(k\) \{[^\n]*\}/) || [])[0];
  const aux = (auth.match(/var auxiliaresDeEstudo = \[[^\]]*\];/) || [])[0];
  const conta = (auth.match(/function chaveDaConta\(k\) \{[\s\S]*?\n {2}\}/) || [])[0];
  if (!isData || !aux || !conta) return null;
  return new Function('EXCLUDE', aux + '\n' + isData + '\n' + conta + '\nreturn { isData: isData, chaveDaConta: chaveDaConta };')({});
}

// _flagLigada e FORA_DO_ESCOPO saem do host e rodam com um localStorage de mentira
function flagDoHost(fonte, flags, armazem) {
  const campo = (fonte.match(/\n {2}FORA_DO_ESCOPO = (\{[^}]*\});/) || [])[1];
  const corpo = (fonte.match(/\n {2}_flagLigada\(nome\)\{([\s\S]*?)\n {2}\}/) || [])[1];
  if (!campo || !corpo) return null;
  const self = { FORA_DO_ESCOPO: Object.assign(new Function('return ' + campo)(), flags || {}) };
  const f = new Function('localStorage', 'return function(nome){' + corpo + '};')(armazem);
  return (nome) => f.call(self, nome);
}
const armazem = (v) => ({ getItem: (k) => (k === 'ct_flag:rankingTurma' ? v : null) });

// os outros três recursos: nenhuma tela, nenhum texto de interface, nenhuma rota de IA os oferece
const OUTROS = [
  ['sentença inédita apostando no próximo edital', /senten[çc]as?\s+in[ée]ditas?|aposta[a-z]*\s+(?:n[oa]s?\s+)?pr[óo]xim[oa]s?\s+edita/i],
  ['correção por magistrado', /corre[çc](?:[ãa]o|[õo]es)\s+(?:feitas?\s+)?(?:por|de)\s+(?:uma?\s+)?(?:magistrad|ju[íi]z|desembargador)/i],
  ['videoaula da correção', /v[íi]deo-?\s?aulas?\s+d[ae]s?\s+corre[çc]|v[íi]deos?\s+d[ae]\s+corre[çc]/i],
];
const SATELITES = ['legis-web.html', 'juris-web.html', 'ritos-web.html', 'pecas-web.html', 'area-web.html', 'prioridade-web.html', 'segunda-fase-web.html', 'sobre.html'];
const semComentarios = (s) => s.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

export function testarForaDoEscopoEstatico(ok) {
  const R = 'ESCOPO ';
  const fonte = ler('Catedra.dc.html');

  // 1. a flag existe, nasce desligada e só liga com '1' na chave deste aparelho
  const lig = flagDoHost(fonte, null, armazem(null));
  ok(!!lig, R + 'FORA_DO_ESCOPO e _flagLigada estão no host e podem ser executados');
  if (lig) {
    const casos = [[null, false], ['1', true], ['0', false], ['true', false], ['', false]].map(([v, esp]) => [v, flagDoHost(fonte, null, armazem(v))('rankingTurma'), esp]);
    ok(casos.every(([, obtido, esp]) => obtido === esp), R + 'rankingTurma nasce desligada e só liga com ct_flag:rankingTurma = "1" (' + casos.map(([v, o]) => JSON.stringify(v) + '→' + o).join(', ') + ')');
    const quebrado = flagDoHost(fonte, null, { getItem: () => { throw new Error('bloqueado'); } })('rankingTurma');
    const ligadaNoCodigo = flagDoHost(fonte, { rankingTurma: true }, armazem(null))('rankingTurma');
    ok(quebrado === false && ligadaNoCodigo === true, R + 'armazenamento bloqueado lê desligada; ligar no código (FORA_DO_ESCOPO) liga sem a chave');
  }

  // 2. a chave da flag não viaja: a regra do auth.js, executada
  const sync = regrasDoSync(ler('auth.js'));
  ok(!!sync && sync.isData('catedra:prefs') === true && sync.chaveDaConta('ct_enam_prova') === true
    && !sync.isData('ct_flag:rankingTurma') && !sync.chaveDaConta('ct_flag:rankingTurma'),
    R + 'ct_flag:rankingTurma fica fora do sync (isData) e da conta (chaveDaConta), que aceitam catedra:prefs e ct_enam_prova');

  // 3. o portão, lido como o parser lê
  const tpl = templateDoApp(fonte), bloco = blocoComunidade(tpl);
  const { raiz, erros } = lerArvore(bloco);
  ok(bloco.length > 2000 && erros.length === 0, R + 'o bloco da Comunidade fecha cada tag no lugar — nenhum </sc-if> que o parser ignore (' + (erros.slice(0, 3).join('; ') || bloco.length + ' caracteres') + ')');
  const um = (f) => descer(raiz, f)[0] || null;
  const lugar = um((n) => /\bdata-com-lugar\b/.test(n.attrs)), lista = um((n) => /\bdata-com-ranking\b/.test(n.attrs));
  ok(!!lugar && naFlag(lugar) && !!lista && naFlag(lista), R + 'o "seu lugar" do topo e a lista do ranking ficam dentro do portão da flag');
  const fica = {
    'Ao vivo': um((n) => /Ao vivo na sala de estudos/.test(n.texto)),
    'Grupos de estudo': um((n) => /ct-titulo/.test(n.attrs) && n.texto.trim() === 'Grupos de estudo'),
    'campo Criar um grupo': um((n) => n.tag === 'input' && /data-k="nome"/.test(n.attrs)),
    'campo Entrar com código': um((n) => n.tag === 'input' && /data-k="codigo"/.test(n.attrs)),
    'Mural': um((n) => n.texto.trim() === 'Mural da comunidade'),
    'seletor do grupo ativo': um((n) => /setComGrupoAtivo/.test(n.attrs)),
    'desafio coletivo': um((n) => /Desafio da semana/.test(n.texto)),
  };
  const fora = Object.entries(fica).filter(([, n]) => !n || naFlag(n)).map(([k, n]) => k + (n ? ' (sob a flag: ' + portoes(n).join(' > ') + ')' : ' (não achado)'));
  ok(fora.length === 0, R + 'sala ao vivo, grupos (criar e entrar), mural, seletor do grupo ativo e desafio coletivo ficam FORA do portão' + (fora.length ? ' — ' + fora.join('; ') : ''));
  const rkSolto = descer(raiz, (n) => /ranking/i.test(n.texto) && !naFlag(n)).map((n) => n.texto.trim().slice(0, 50));
  ok(rkSolto.length === 0, R + 'nenhum texto da Comunidade fala de ranking fora do portão (' + (rkSolto.join(' | ') || 'nenhum') + ')');

  // 4. os textos de cada lado da flag: desligada, nenhum fala de ranking; o aviso de que a semana é compartilhada fica
  const pares = [...fonte.matchAll(/(\w+):\(_rkTurma\?'((?:[^'\\]|\\.)*)':'((?:[^'\\]|\\.)*)'\)/g)].map((m) => ({ nome: m[1], lig: m[2], des: m[3] }));
  const nomes = pares.map((p) => p.nome);
  const esperados = ['comHeroTitulo', 'comHeroSub', 'comSemanaTitulo', 'comSemanaSub', 'baixaRankingTxt', 'hint', 'comunidade'];
  ok((fonte.match(/const _rkTurma=this\._flagLigada\('rankingTurma'\);/g) || []).length === 1 && esperados.every((n) => nomes.includes(n)),
    R + 'a flag é lida uma vez por pintura e decide os textos (' + nomes.join(', ') + ')');
  const ruins = pares.filter((p) => /ranking|seu lugar|suba no/i.test(p.des)).map((p) => p.nome + ': ' + p.des);
  const heroi = pares.find((p) => p.nome === 'comHeroSub');
  ok(ruins.length === 0 && !!heroi && /automaticamente/.test(heroi.des) && /grupos/.test(heroi.des) && /ranking/.test(heroi.lig),
    R + 'flag desligada: nenhum texto fala de ranking e o topo ainda avisa que a semana aparece para os grupos («' + (heroi ? heroi.des : '?') + '»)' + (ruins.length ? ' — ' + ruins.join('; ') : ''));
  const conf = fonte.match(/window\.confirm\(this\._flagLigada\('rankingTurma'\)\?'([^']*)':'([^']*)'\)/);
  ok(!!conf && /ranking/.test(conf[1]) && !/ranking/i.test(conf[2]) && /TODO MUNDO/.test(conf[2]), R + 'apagar grupo: a confirmação só fala do ranking com a flag ligada');

  // 5. os outros três recursos não existem em tela, texto de interface, satélite nem rota de IA
  const codigo = semComentarios(fonte.slice(fonte.indexOf('</x-dc>')));
  const alvos = [['template', semComentarios(tpl)], ['código do host', codigo]]
    .concat(SATELITES.map((f) => [f, semComentarios(ler(f))]))
    .concat(fs.readdirSync(path.join(RAIZ, 'api')).filter((f) => f.endsWith('.js')).map((f) => ['api/' + f, semComentarios(ler('api/' + f))]));
  const cobre = /Mural da comunidade/.test(alvos[0][1]) && /Grupos de estudo/.test(alvos[0][1]) && /renderVals\(\)/.test(codigo) && /apagarGrupo/.test(codigo) && alvos.length >= 12;
  const achados = [];
  for (const [onde, txt] of alvos) for (const [nome, re] of OUTROS) { const m = txt.match(re); if (m) achados.push(nome + ' em ' + onde + ' («' + m[0] + '»)'); }
  ok(cobre && achados.length === 0, R + 'sentença inédita, correção por magistrado e videoaula da correção não existem no app (' + alvos.length + ' fontes lidas, template e código inteiros' + (achados.length ? '; achados: ' + achados.join('; ') : '') + ')');
}

/* ---------- parte 2: navegador ---------- */
const ESTADO = {
  comMyUid: 'eu', comGrupoAtivo: 'g1', comErro: '',
  meusGrupos: [{ id: 'g1', nome: 'Turma TJSP', codigo: 'ABC123', membros: [{ nome: 'Ana' }, { nome: 'Bruno' }] }, { id: 'g2', nome: 'Foco ENAM', codigo: 'XYZ789', membros: [] }],
  comRankRows: [{ user_id: 'a', nome: 'Ana', minutos: 900, ao_vivo: true, streak: 4, revisoes: 12 }, { user_id: 'eu', nome: 'Você', minutos: 600, streak: 0, revisoes: 3 },
    { user_id: 'b', nome: 'Bruno', minutos: 300, streak: 0, revisoes: 2 }, { user_id: 'c', nome: 'Caio', minutos: 120, streak: 0, revisoes: 1 }],
};

// no navegador: mede a Comunidade (caixas, cores calculadas, contraste no lugar do texto)
function medirComunidade() {
  const main = document.querySelector('main') || document.body;
  const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
  const tela = document.createElement('canvas'); tela.width = tela.height = 1;
  const cx = tela.getContext('2d', { willReadFrequently: true });
  const rgba = (cor) => { cx.fillStyle = '#010203'; cx.fillStyle = cor; if (cx.fillStyle === '#010203') return null;
    cx.clearRect(0, 0, 1, 1); cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const sobre = (t, b) => [0, 1, 2].map((i) => t[i] * t[3] + b[i] * (1 - t[3])).concat(1);
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const razao = (a, b) => { const x = lum(a), y = lum(b); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
  const opac = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; };
  const fundoDe = (el) => { const cam = []; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c && c[3] > 0) { cam.push(c); if (c[3] >= 1) break; } }
    let b = [255, 255, 255, 1]; for (let i = cam.length - 1; i >= 0; i--) b = sobre(cam[i], b); return b; };
  const contraste = (el) => { const t = rgba(getComputedStyle(el).color); if (!t) return 0; const f = fundoDe(el); return razao(sobre([t[0], t[1], t[2], t[3] * opac(el)], f), f); };
  // texto sobre o gradiente do herói: a cor do gradiente (e dos círculos decorativos) em cada canto de cada linha
  const contrasteNoHeroi = (p) => {
    const heroi = p.closest('[style*="--heroGrad"]'); if (!heroi) return { pior: 0, motivo: 'sem herói' };
    const b = heroi.getBoundingClientRect(), cs = getComputedStyle(heroi);
    let ang = 180, paradas;
    const m = /linear-gradient\((.*)\)\s*$/.exec(cs.backgroundImage);
    if (m) {
      const partes = []; let prof = 0, cur = '';
      for (const ch of m[1]) { if (ch === '(') prof++; if (ch === ')') prof--; if (ch === ',' && !prof) { partes.push(cur.trim()); cur = ''; } else cur += ch; }
      partes.push(cur.trim());
      if (/deg$/.test(partes[0])) ang = parseFloat(partes.shift());
      else if (/^to\s/.test(partes[0])) ang = ({ 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270 })[partes.shift()] || 180;
      paradas = partes.map((s, i, arr) => { const mm = /^(.*?)\s+(-?[\d.]+)%$/.exec(s); return { cor: rgba(mm ? mm[1] : s), pos: mm ? +mm[2] / 100 : i / Math.max(1, arr.length - 1) }; });
    } else { const c = rgba(cs.backgroundColor); paradas = [{ cor: c, pos: 0 }, { cor: c, pos: 1 }]; }
    if (paradas.some((q) => !q.cor)) return { pior: 0, motivo: 'cor do gradiente ilegível: ' + cs.backgroundImage };
    const th = ang * Math.PI / 180, L = Math.abs(b.width * Math.sin(th)) + Math.abs(b.height * Math.cos(th));
    const circulos = [...heroi.children].filter((c) => /99px/.test(c.style.borderRadius) && c.style.position === 'absolute').map((c) => { const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2, cor: rgba(getComputedStyle(c).backgroundColor) }; });
    for (const ps of ['::before', '::after']) { const q = getComputedStyle(heroi, ps); if (q.content === 'none' || q.position !== 'absolute') continue;
      const w = parseFloat(q.width), h = parseFloat(q.height); if (!(w > 0)) continue;
      const left = q.left !== 'auto' ? parseFloat(q.left) : b.width - parseFloat(q.right) - w, top = q.top !== 'auto' ? parseFloat(q.top) : b.height - parseFloat(q.bottom) - h;
      circulos.push({ x: b.left + left + w / 2, y: b.top + top + h / 2, r: w / 2, cor: rgba(q.backgroundColor) }); }
    const corEm = (x, y) => { const t = Math.max(0, Math.min(1, ((x - b.left - b.width / 2) * Math.sin(th) - (y - b.top - b.height / 2) * Math.cos(th)) / L + 0.5));
      let i = 0; while (i < paradas.length - 2 && t > paradas[i + 1].pos) i++;
      const a = paradas[i], z = paradas[i + 1] || a, k = z.pos > a.pos ? Math.max(0, Math.min(1, (t - a.pos) / (z.pos - a.pos))) : 0;
      let c = [0, 1, 2].map((j) => a.cor[j] + (z.cor[j] - a.cor[j]) * k).concat(1);
      for (const o of circulos) if (o.cor && o.cor[3] > 0 && Math.hypot(x - o.x, y - o.y) <= o.r) c = sobre(o.cor, c);
      return c; };
    const t = rgba(getComputedStyle(p).color), op = t[3] * opac(p);
    const rg = document.createRange(); rg.selectNodeContents(p);
    const linhas = [...rg.getClientRects()].filter((l) => l.width > 1);
    let pior = Infinity;
    for (const l of linhas) for (const [x, y] of [[l.left + 1, l.top + 1], [l.right - 1, l.top + 1], [l.left + 1, l.bottom - 1], [l.right - 1, l.bottom - 1]]) {
      const f = corEm(x, y); pior = Math.min(pior, razao(sobre([t[0], t[1], t[2], op], f), f)); }
    return { pior: linhas.length ? pior : 0, linhas: linhas.length };
  };
  const exato = (t) => [...main.querySelectorAll('*')].filter((e) => e.textContent.trim() === t).pop() || null;
  const caixa = (el) => { if (!el) return { vis: false, w: 0, h: 0 }; const r = el.getBoundingClientRect(); return { vis: vis(el), w: Math.round(r.width), h: Math.round(r.height) }; };
  const botao = (t) => [...main.querySelectorAll('button')].find((b) => b.textContent.trim() === t) || null;
  const semana = main.querySelector('[data-com-semana]'), desafio = main.querySelector('[data-com-desafio]');
  const ranking = main.querySelector('[data-com-ranking]'), lugar = main.querySelector('[data-com-lugar]');
  const semTit = semana && semana.querySelector('.ct-titulo'), semSub = semTit && semTit.nextElementSibling;
  const h2 = [...main.querySelectorAll('h2')].find((h) => /^Estude junto/.test(h.textContent.trim()));
  const heroSub = h2 ? h2.nextElementSibling : null;
  const cab = [...document.querySelectorAll('p')].find((q) => /^Estude junto ·/.test(q.textContent.trim()));
  const aoVivo = exato('Ao vivo na sala de estudos');
  return {
    txt: main.innerText,
    ranking: caixa(ranking), linhasRanking: ranking ? [...ranking.children].filter((c) => /\d+º/.test(c.textContent)).length : 0,
    lugar: caixa(lugar), lugarTxt: lugar ? lugar.innerText.replace(/\s+/g, ' ').trim() : '',
    medalhas: [...main.querySelectorAll('.ct-ladrilho[class*="ct-medalha-"]')].filter(vis).length,
    aoVivo: caixa(aoVivo), aoVivoTxt: aoVivo && aoVivo.parentElement ? aoVivo.parentElement.innerText : '',
    grupos: caixa(exato('Grupos de estudo')), mural: caixa(exato('Mural da comunidade')),
    campoNome: caixa(main.querySelector('input[data-k="nome"]')), campoCodigo: caixa(main.querySelector('input[data-k="codigo"]')),
    criar: caixa(botao('Criar')), entrar: caixa(botao('Entrar')),
    semana: semana ? { ...caixa(semana), gam: semana.classList.contains('ct-gam'), titulo: semTit ? semTit.textContent.trim() : '', sub: semSub ? semSub.textContent.trim() : '',
      cTit: semTit ? contraste(semTit) : 0, cSub: semSub ? contraste(semSub) : 0 } : null,
    chips: semana ? [...semana.querySelectorAll('button[data-id]')].map((b) => ({ id: b.dataset.id, nome: b.textContent.trim(), fundo: getComputedStyle(b).backgroundColor, ...caixa(b) })) : [],
    desafio: caixa(desafio), desafioTxt: desafio ? desafio.textContent.replace(/\s+/g, ' ').trim() : '',
    heroTit: h2 ? h2.textContent.trim() : '', heroSub: heroSub ? heroSub.textContent.trim() : '', heroC: heroSub ? contrasteNoHeroi(heroSub) : { pior: 0 },
    cab: cab ? cab.textContent.trim() : '',
    muralItens: (main.innerText.match(/estudou \d/g) || []).length,
    rolagemX: Math.max(0, document.scrollingElement.scrollWidth - window.innerWidth),
  };
}

export async function testarForaDoEscopo(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'ESCOPO [' + motor + '] ';
  const browser = pageDaSuite.context().browser();
  const w = (ms) => new Promise((r) => setTimeout(r, ms));
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  // semeia a partir de /__semente (404 na mesma origem): com o app aberto, semear é corrida com o autosave
  async function abrir(contexto, extras) {
    const ctx = await browser.newContext(contexto);
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String((e && e.message) || e)));
    await page.goto(base + '/__semente');
    await page.evaluate((ex) => { localStorage.clear(); const set = (k, v) => localStorage.setItem('catedra:' + k, v);
      set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica'); set('aceite', JSON.stringify({ termos: 1, privacidade: 1, ts: Date.now() }));
      Object.keys(ex).forEach((k) => localStorage.setItem(k, ex[k])); }, extras || {});
    await page.goto(base + '/' + arquivo);
    await page.waitForFunction(() => !!window.__catedraApp && typeof window.__catedraGoView === 'function', null, { timeout: 30000 });
    return { ctx, page, erros };
  }
  const irComunidade = async (page) => {
    await page.evaluate(() => window.__catedraGoView('comunidade'));
    await page.waitForFunction(() => /Ao vivo na sala de estudos/.test((document.querySelector('main') || document.body).innerText), null, { timeout: 20000 });
    await w(500);
  };
  const pintar = (page, estado) => page.evaluate((e) => new Promise((r) => window.__catedraApp.setState(e, r)), estado).then(() => w(450));
  const semRanking = (m) => !m.ranking.vis && !m.lugar.vis && m.medalhas === 0 && !/ranking|seu lugar|suba no/i.test(m.txt);
  const restoFica = (m) => m.aoVivo.vis && m.grupos.vis && m.campoNome.vis && m.campoCodigo.vis && m.criar.vis && m.entrar.vis && m.mural.vis;
  const resumo = (m) => 'ao vivo ' + m.aoVivo.vis + ', grupos ' + m.grupos.vis + ', criar ' + m.campoNome.vis + '/' + m.criar.vis + ', entrar ' + m.campoCodigo.vis + '/' + m.entrar.vis + ', mural ' + m.mural.vis;

  /* ---- mouse, claro, 1180 de largura ---- */
  {
    const { ctx, page, erros } = await abrir({ viewport: { width: 1180, height: 900 } });
    try {
      await irComunidade(page);
      // (a) sem grupo, flag desligada (o padrão)
      const a = await page.evaluate(medirComunidade);
      ok(semRanking(a), R + 'padrão (flag desligada): nem ranking, nem "seu lugar", nem medalha, e a palavra ranking some da tela');
      ok(restoFica(a) && /Ainda não há publicações na comunidade\./.test(a.txt), R + 'padrão: sala ao vivo, Grupos de estudo (criar e entrar) e Mural aparecem, medidos na tela (' + resumo(a) + ')');
      ok(!a.semana, R + 'padrão sem grupo: o cartão da semana do grupo não aparece vazio');
      ok(a.heroTit === 'Estude junto.' && /aparecem automaticamente para quem está nos seus grupos/.test(a.heroSub) && a.cab === 'Estude junto · grupos e quem está estudando agora',
        R + 'padrão: o topo diz «' + a.heroTit + '», avisa que a semana aparece para os grupos e o cabeçalho não promete ranking («' + a.cab + '»)');
      ok(a.heroC.pior >= 4.5, R + 'padrão, claro: o aviso do topo tem contraste ≥ 4,5:1 sobre o gradiente onde está escrito (pior canto ' + a.heroC.pior + ':1 em ' + a.heroC.linhas + ' linhas' + (a.heroC.motivo ? '; ' + a.heroC.motivo : '') + ')');

      // (b) dois grupos e a atividade da semana, flag desligada
      await pintar(page, ESTADO);
      const b = await page.evaluate(medirComunidade);
      ok(semRanking(b) && b.linhasRanking === 0, R + 'com grupo e atividade: o ranking continua fora (linhas ' + b.linhasRanking + ', medalhas ' + b.medalhas + ')');
      ok(!!b.semana && b.semana.vis && !b.semana.gam && b.semana.titulo === 'Semana do grupo' && b.chips.length === 2 && b.chips.every((c) => c.vis) && b.chips.map((c) => c.nome).join('|') === 'Turma TJSP|Foco ENAM',
        R + 'com grupo: o seletor do grupo ativo continua, no cartão «' + (b.semana && b.semana.titulo) + '» (' + b.chips.map((c) => c.nome + ' ' + c.w + '×' + c.h).join(', ') + ')');
      ok(b.desafio.vis && /Desafio da semana: 50 revisões em grupo/.test(b.desafioTxt) && /18\/50/.test(b.desafioTxt), R + 'com grupo: o desafio coletivo (não é ranking) continua («' + b.desafioTxt + '»)');
      ok(restoFica(b) && b.muralItens >= 3 && /Ana/.test(b.aoVivoTxt), R + 'com grupo: sala ao vivo (Ana), grupos e mural com ' + b.muralItens + ' publicações (' + resumo(b) + ')');
      ok(!!b.semana && b.semana.cTit >= 4.5 && b.semana.cSub >= 4.5, R + 'claro: título e linha de apoio do cartão do grupo com contraste ≥ 4,5:1 (' + (b.semana && b.semana.cTit) + ' e ' + (b.semana && b.semana.cSub) + ')');
      ok(b.rolagemX === 0, R + 'sem rolagem horizontal (' + b.rolagemX + ' px)');
      // o seletor troca o grupo de verdade (a ida ao servidor é trocada por um dublê que só grava o grupo)
      const troca = await page.evaluate(async () => {
        const app = window.__catedraApp; app._loadRankingGrupo = async (gid) => { app.setState({ comGrupoAtivo: gid }); };
        const chip = document.querySelector('main [data-com-semana] button[data-id="g2"]'); if (!chip) return { erro: 'sem o botão do segundo grupo' };
        chip.click(); await new Promise((r) => setTimeout(r, 450));
        const c1 = document.querySelector('main [data-com-semana] button[data-id="g1"]'), c2 = document.querySelector('main [data-com-semana] button[data-id="g2"]');
        return { ativo: app.state.comGrupoAtivo, f1: getComputedStyle(c1).backgroundColor, f2: getComputedStyle(c2).backgroundColor };
      });
      ok(!troca.erro && troca.ativo === 'g2' && troca.f1 !== troca.f2, R + 'tocar no segundo grupo troca o grupo ativo e o botão marcado (' + (troca.erro || troca.ativo + '; ' + troca.f1 + ' × ' + troca.f2) + ')');
      await pintar(page, { comGrupoAtivo: 'g1' });

      // (c) baixa estimulação com a flag desligada: o desafio sai, o seletor fica
      await page.evaluate(() => new Promise((r) => { const app = window.__catedraApp; app.setState({ prefs: { ...(app.state.prefs || {}), baixaEstimulacao: true } }, r); }));
      await w(450);
      const c = await page.evaluate(medirComunidade);
      ok(!!c.semana && c.semana.vis && c.chips.length === 2 && c.chips.every((x) => x.vis) && !c.desafio.vis && !/Desafio da semana/.test(c.txt) && semRanking(c),
        R + 'baixa estimulação: o desafio da semana some e o seletor do grupo fica (cartão ' + !!(c.semana && c.semana.vis) + ', desafio ' + c.desafio.vis + ')');
      await page.evaluate(() => new Promise((r) => { const app = window.__catedraApp; app.setState({ prefs: { ...(app.state.prefs || {}), baixaEstimulacao: false } }, r); }));

      // (d) flag ligada neste aparelho: o ranking volta inteiro, igual ao da main
      await page.evaluate(() => localStorage.setItem('ct_flag:rankingTurma', '1'));
      await pintar(page, {});
      const d = await page.evaluate(medirComunidade);
      ok(d.ranking.vis && d.linhasRanking === 4 && d.medalhas === 3 && d.lugar.vis && /2º seu lugar/.test(d.lugarTxt) && d.heroTit === 'Estude junto. Suba no ranking.' && !!d.semana && d.semana.titulo === 'Ranking da semana' && d.semana.gam,
        R + 'flag ligada: o ranking volta (' + d.linhasRanking + ' linhas, ' + d.medalhas + ' medalhas, «' + d.lugarTxt + '», cartão «' + (d.semana && d.semana.titulo) + '»)');
      ok(restoFica(d) && d.chips.length === 2 && d.desafio.vis, R + 'flag ligada: grupos, mural, seletor e desafio continuam (' + resumo(d) + ')');

      // (e) Bem-estar › Abrir grupos de estudo chega aos grupos
      await page.evaluate(() => localStorage.removeItem('ct_flag:rankingTurma'));
      await page.evaluate(() => window.__catedraGoView('bemestar'));
      await page.waitForFunction(() => [...document.querySelectorAll('main button')].some((x) => x.textContent.trim() === 'Abrir grupos de estudo'), null, { timeout: 15000 });
      await page.evaluate(() => [...document.querySelectorAll('main button')].find((x) => x.textContent.trim() === 'Abrir grupos de estudo').click());
      await page.waitForFunction(() => /Ao vivo na sala de estudos/.test((document.querySelector('main') || document.body).innerText), null, { timeout: 15000 });
      await w(450);
      const e = await page.evaluate(medirComunidade);
      ok(e.grupos.vis && e.campoNome.vis && e.campoCodigo.vis && semRanking(e), R + 'Bem-estar › Abrir grupos de estudo chega à Comunidade com os grupos e sem ranking');
      // (f) Ajustes › Baixa estimulação: a descrição só cita o ranking quando ele existe na tela
      const descricaoBaixa = () => page.evaluate(() => { const el = document.querySelector('main [data-pref="baixaEstimulacao"]'); return el ? el.innerText.replace(/\s+/g, ' ').trim() : ''; });
      await page.evaluate(async () => {
        const espera = (ms) => new Promise((r) => setTimeout(r, ms));
        window.__catedraGoView('ajustes'); await espera(600);
        const aba = [...document.querySelectorAll('main .aj-abas button[data-s]')].find((b) => b.dataset.s === 'automacoes'); if (aba) { aba.click(); await espera(500); }
      });
      const ajDes = await descricaoBaixa();
      await page.evaluate(() => localStorage.setItem('ct_flag:rankingTurma', '1'));
      await pintar(page, {});
      const ajLig = await descricaoBaixa();
      await page.evaluate(() => localStorage.removeItem('ct_flag:rankingTurma'));
      ok(/Esconde ofensiva, escudos, desafio da semana/.test(ajDes) && !/ranking/i.test(ajDes) && /Esconde ofensiva, escudos, ranking, desafio da semana/.test(ajLig),
        R + 'Ajustes › Baixa estimulação: a descrição só cita o ranking com a flag ligada («' + ajDes.slice(0, 80) + '…»)');
      ok(!erros.length, R + 'sem erro de página (' + (erros[0] || 'nenhum') + ')');
    } catch (e) { ok(false, R + 'mouse: exceção ' + String((e && e.message) || e).split('\n')[0]); }
    finally { await ctx.close(); }
  }

  /* ---- toque de iPad (820×1180), escuro ---- */
  {
    const { ctx, page, erros } = await abrir({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: false }, { 'catedra:dark': '1' });
    try {
      // o atributo de toque é o que as regras de CSS leem; sem ele o caso mediria a versão de mouse
      await page.evaluate(() => { const app = window.__catedraApp; if (!app._toque) { app._toque = true; app.setState({}); } });
      await irComunidade(page);
      await pintar(page, ESTADO);
      const t = await page.evaluate(medirComunidade);
      const toque = await page.evaluate(() => document.querySelector('[data-toque]').getAttribute('data-toque') === '1' && document.querySelector('[data-dark]').getAttribute('data-dark') === '1');
      ok(toque && semRanking(t) && restoFica(t), R + 'iPad, escuro: sem ranking e com sala ao vivo, grupos e mural (' + resumo(t) + ')');
      const alvos = t.chips.concat([{ nome: 'Criar', ...t.criar }, { nome: 'Entrar', ...t.entrar }]);
      ok(t.chips.length === 2 && alvos.every((x) => x.vis && x.w >= 44 && x.h >= 44) && t.campoNome.h >= 44 && t.campoCodigo.h >= 44,
        R + 'iPad: seletor do grupo, Criar, Entrar e os dois campos com alvo ≥ 44 px (' + alvos.map((x) => x.nome + ' ' + x.w + '×' + x.h).join(', ') + '; campos ' + t.campoNome.h + ' e ' + t.campoCodigo.h + ')');
      ok(!!t.semana && t.semana.cTit >= 4.5 && t.semana.cSub >= 4.5 && t.heroC.pior >= 4.5,
        R + 'escuro: cartão do grupo (' + (t.semana && t.semana.cTit) + ' e ' + (t.semana && t.semana.cSub) + ') e aviso do topo (pior canto ' + t.heroC.pior + ':1' + (t.heroC.motivo ? '; ' + t.heroC.motivo : '') + ') com contraste ≥ 4,5:1');
      ok(t.rolagemX === 0 && !erros.length, R + 'iPad: sem rolagem horizontal (' + t.rolagemX + ' px) e sem erro de página (' + (erros[0] || 'nenhum') + ')');
    } catch (e) { ok(false, R + 'iPad: exceção ' + String((e && e.message) || e).split('\n')[0]); }
    finally { await ctx.close(); }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let falhas = 0, total = 0;
  testarForaDoEscopoEstatico((c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); });
  console.log(falhas ? ('\nFALHAS: ' + falhas + ' de ' + total) : ('\n' + total + ' verificações passaram'));
  process.exit(falhas ? 1 : 0);
}
