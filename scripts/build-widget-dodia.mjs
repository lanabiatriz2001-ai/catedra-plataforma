// scripts/build-widget-dodia.mjs — o recorte da "lei/súmula do dia" que vai DENTRO do widget (Mac, iPad e iPhone):
// widget/dodia.json.
//
// Artigos: os que mais caíram em prova (incidencia.json → provas: espelhos oficiais de 2ª fase), por número de
// provas distintas, com o texto de leis-seca.js / leis-seca-areas.js.
// Súmulas (vinculantes, STF e STJ): por quantos julgados do acervo do JURIS as citam. Não há no repositório dado de
// súmula cobrada em prova, e o widget diz isso com todas as letras ("citada em N julgados"). Decisão da dona, 01/10/2026.
// Ordem: dois artigos, uma súmula, fixa no arquivo; o widget gira a lista pela data (WidgetDoDia.swift).
//
//   node scripts/build-widget-dodia.mjs           # grava widget/dodia.json
//   node scripts/build-widget-dodia.mjs --checar  # só confere se está em dia (sai 1 se não)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { carregarCoresRamo } from './lib-cores-ramo.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = join(ROOT, 'widget', 'dodia.json');
const MAX_ARTIGOS = 300, MAX_SUMULAS = 150, MAX_TEXTO = 500, MAX_PROVAS = 8, TETO_BYTES = 400 * 1024;
const FORA = new Set(['Cancelada', 'Superada', 'Revogada', 'Publicação suspensa']);

// Ramo de cada diploma: só para a COR (o widget mostra o nome do diploma). Os que não estão aqui caem na paleta
// estável do CT_COR_RAMO pelo próprio nome.
const RAMO_DO_DIPLOMA = {
  'Constituição Federal': 'Direito Constitucional',
  'Código Civil': 'Direito Civil',
  'Código de Processo Civil': 'Direito Processual Civil',
  'Código Penal': 'Direito Penal',
  'Código de Processo Penal': 'Direito Processual Penal',
  'Lei de Drogas': 'Direito Penal',
  'Lei de Lavagem de Dinheiro': 'Direito Penal',
  'Lei de Organização Criminosa': 'Direito Penal',
  'Estatuto do Desarmamento': 'Direito Penal',
  'Lei de Execução Penal': 'Direito Processual Penal',
  'Lei de Recuperação e Falências': 'Direito Empresarial',
  'Lei de Propriedade Industrial': 'Direito Empresarial',
  'Lei do Registro de Empresas Mercantis': 'Direito Empresarial',
  'Código de Defesa do Consumidor': 'Direito do Consumidor',
  'Estatuto da Criança e do Adolescente': 'ECA',
  'Lei das Concessões e Permissões de Serviços Públicos': 'Direito Administrativo',
  'Lei de Licitações e Contratos': 'Direito Administrativo',
  'Lei de Improbidade Administrativa': 'Direito Administrativo',
  'Estatuto dos Servidores Públicos Federais': 'Direito Administrativo',
  'Lei da Tutela Antecipada contra a Fazenda Pública': 'Direito Processual Civil',
  'Lei da Ação Civil Pública': 'Direito Processual Civil',
  'Lei da Impenhorabilidade do Bem de Família': 'Direito Civil',
  'Lei do Inquilinato': 'Direito Civil',
  'Código Tributário Nacional': 'Direito Tributário',
  'Regimes Próprios de Previdência Social (RPPS)': 'Direito Previdenciário',
  'Lei de Benefícios da Previdência Social': 'Direito Previdenciário',
};

globalThis.window = globalThis.window || {};
const carrega = (f) => { new Function('window', readFileSync(join(ROOT, f), 'utf8'))(globalThis.window); };
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const numArt = (r) => { const m = String(r).replace(/\./g, '').match(/\d+(?:-[A-Za-z])?/); return m ? m[0].toUpperCase() : null; };
const corta = (t) => {
  const s = String(t || '').replace(/\s+/g, ' ').trim();
  if (s.length <= MAX_TEXTO) return s;
  const c = s.slice(0, MAX_TEXTO - 1);
  return c.slice(0, Math.max(c.lastIndexOf(' '), MAX_TEXTO - 40)).replace(/[,;:.\s]+$/, '') + '…';
};
const semRotulo = (t) => String(t || '').replace(/^\s*Art\.?\s*[\d.]+(?:-[A-Z])?\s*(?:[º°]|o(?![a-zà-ú]))?\s*[-–.]?\s*/i, '');
const titulo = (n) => 'Art. ' + (/^\d$/.test(n) ? n + 'º' : n.replace(/^(\d+)(\d{3})(\b|-)/, '$1.$2$3'));

export function montar() {
  carrega('leis-seca.js'); carrega('leis-seca-areas.js'); carrega('juris-index.js'); carrega('juris-text.js');
  const W = globalThis.window;
  const { corRamo } = carregarCoresRamo(ROOT);
  const cor = (ramo, dark) => String(corRamo(ramo, dark)).toLowerCase();
  const inc = JSON.parse(readFileSync(join(ROOT, 'incidencia.json'), 'utf8'));

  // texto por diploma (nome normalizado) e número de artigo
  const leis = [...(W.CT_LEIS || [])];
  const A = W.CT_LEIS_AREAS; (Array.isArray(A) ? A : Object.values(A || {})).forEach(x => { if (x && x.artigos) leis.push(x); });
  const texto = new Map();
  for (const l of leis) {
    const m = texto.get(norm(l.nome)) || new Map();
    for (const a of l.artigos || []) { const n = numArt(a.rot); if (n && !m.has(n)) m.set(n, a.txt); }
    texto.set(norm(l.nome), m);
  }

  const artigos = [];
  for (const [k, d] of Object.entries(inc.provas || {})) {
    if (k === 'meta' || !d || !d.artigos) continue;
    const doDiploma = texto.get(norm(d.nome));
    for (const [a, v] of Object.entries(d.artigos)) {
      const n = numArt(a); const t = n && doDiploma && doDiploma.get(n);
      if (!t) continue;
      const vistas = new Map();
      for (const p of (v && v.provas) || []) if (p && p.id && !vistas.has(p.id)) vistas.set(p.id, { orgao: String(p.orgao || ''), ano: +p.ano || 0 });
      if (!vistas.size) continue;
      const ramo = RAMO_DO_DIPLOMA[d.nome] || d.nome;
      const provas = [...vistas.values()].sort((x, y) => y.ano - x.ano || x.orgao.localeCompare(y.orgao)).slice(0, MAX_PROVAS);
      artigos.push({ tipo: 'artigo', id: k + '#' + n, titulo: titulo(n), diploma: d.nome, artigo: n, ramo,
        cor: cor(ramo, false), corD: cor(ramo, true), texto: corta(semRotulo(t)),
        n: vistas.size, rotulo: vistas.size === 1 ? 'caiu em 1 prova' : 'caiu em ' + vistas.size + ' provas', provas });
    }
  }
  artigos.sort((x, y) => y.n - x.n || x.diploma.localeCompare(y.diploma) || x.artigo.localeCompare(y.artigo, 'pt', { numeric: true }));

  // súmulas: quantos verbetes do acervo citam cada uma (o próprio verbete não conta)
  const idx = new Map((W.__JURIS_IDX__ || []).map(r => [r[0], r]));
  const TXT = W.__JURIS_TXT__ || {};
  const re = /S[úu]mula\s+(Vinculante\s+)?(?:n[º°o.]*\s*)?(\d{1,4})(?:\s*(?:\/|do|da|,\s*do)\s*(STF|STJ|Supremo|Superior))?/gi;
  const cont = new Map();
  for (const [id, v] of Object.entries(TXT)) {
    const txt = Object.values(v || {}).filter(x => typeof x === 'string').join(' ');
    const vistos = new Set(); let m; re.lastIndex = 0;
    while ((m = re.exec(txt))) {
      const trib = /STF|Supremo/i.test(m[3] || '') ? 'STF' : /STJ|Superior/i.test(m[3] || '') ? 'STJ' : '';
      const chave = m[1] ? 'STF-SV-' + m[2] : (trib ? trib + '-SUM-' + m[2] : null);
      if (chave && chave !== id) vistos.add(chave);
    }
    for (const c of vistos) cont.set(c, (cont.get(c) || 0) + 1);
  }
  const sumulas = [];
  for (const [id, n] of cont) {
    const r = idx.get(id); const t = TXT[id] && TXT[id].en;
    if (!r || !t || FORA.has(r[8])) continue;
    const ramo = r[5] || 'Jurisprudência';
    sumulas.push({ tipo: 'sumula', id, titulo: id.startsWith('STF-SV-') ? 'Súmula Vinculante ' + r[3] : 'Súmula ' + r[3] + ' do ' + r[1],
      diploma: r[1], ramo, cor: cor(ramo, false), corD: cor(ramo, true), texto: corta(t),
      n, rotulo: n === 1 ? 'citada em 1 julgado' : 'citada em ' + n + ' julgados' });
  }
  sumulas.sort((x, y) => y.n - x.n || x.id.localeCompare(y.id, 'pt', { numeric: true }));

  const AR = artigos.slice(0, MAX_ARTIGOS), SU = sumulas.slice(0, MAX_SUMULAS);
  const itens = []; let ia = 0, is = 0;
  while (ia < AR.length || is < SU.length) {
    for (let k = 0; k < 2 && ia < AR.length; k++) itens.push(AR[ia++]);
    if (is < SU.length) itens.push(SU[is++]);
  }
  return { v: 1, fontes: { incidencia: (inc.meta && inc.meta.gerado) || '' }, itens };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = JSON.stringify(montar()) + '\n';
  if (process.argv.includes('--checar')) {
    const atual = existsSync(SAIDA) ? readFileSync(SAIDA, 'utf8') : '';
    if (atual !== out) { console.error('✗ widget/dodia.json está desatualizado: rode node scripts/build-widget-dodia.mjs'); process.exit(1); }
    console.log('✓ widget/dodia.json em dia'); process.exit(0);
  }
  if (Buffer.byteLength(out) > TETO_BYTES) { console.error('✗ dodia.json passou de 400 KB (' + Buffer.byteLength(out) + ')'); process.exit(1); }
  writeFileSync(SAIDA, out);
  const d = JSON.parse(out);
  console.log('✓ widget/dodia.json: ' + d.itens.length + ' itens (' + d.itens.filter(i => i.tipo === 'artigo').length + ' artigos, '
    + d.itens.filter(i => i.tipo === 'sumula').length + ' súmulas), ' + Math.round(Buffer.byteLength(out) / 1024) + ' KB');
}
