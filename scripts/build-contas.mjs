// scripts/build-contas.mjs — gera o acervo da Central de Contas (TCU + TCEs)
// consumido pela aba CátedraJURIS.
//
// POR QUE ISTO EXISTE: a Central de Contas precisa do texto oficial dos verbetes
// para funcionar offline no app nativo (file://), onde fetch() de JSON local é
// bloqueado. Então o acervo vira DOIS bundles `<script>` no mesmo esquema do
// CátedraJURIS — assim os cards, o leitor, os grifos e o status de estudo do
// juris-web.html são reaproveitados sem duplicar código:
//
//   contas-index.js  → window.__CONTAS_IDX__ = [[id,tr,fo,nu,ti,ra,te,da,si,im], …]
//   contas-text.js   → window.__CONTAS_TXT__ = { id: {en,co,ob,fp,og,ur} }
//
// FONTES (todas oficiais, nada de terceiro):
//   · TCU — dados abertos de jurisprudência (CSV, pipe-delimitado, atualização
//     semanal): súmulas, Boletim de Jurisprudência, Boletim de Pessoal e
//     Informativo de Licitações e Contratos.
//   · TCE-SP, TCE-MG, TCE-BA — repertórios de súmulas publicados em HTML nos
//     portais dos tribunais (os únicos três, entre os 33, que servem o texto
//     integral direto no HTML; os demais entram só no diretório, com link).
//
// Rode `node scripts/build-contas.mjs` para atualizar o acervo. É idempotente e
// os CSVs ficam em cache em scripts/.cache-contas/ (fora do git).

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'scripts', '.cache-contas');
mkdirSync(CACHE, { recursive: true });

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

// Cache de 12h: rodar o script duas vezes seguidas não rebaixa nem o TCU nem os
// portais estaduais (o do TCU tem arquivo de 111 MB na mesma pasta).
const TTL = 12 * 60 * 60 * 1000;

async function baixar(url, nome) {
  const alvo = join(CACHE, nome);
  if (existsSync(alvo) && Date.now() - statSync(alvo).mtimeMs < TTL) {
    return readFileSync(alvo, 'utf8');
  }
  process.stdout.write(`  · baixando ${nome}… `);
  const r = await fetch(url, { headers: { 'user-agent': UA } });
  if (!r.ok) throw new Error(`${url} respondeu ${r.status}`);
  const txt = await r.text();
  writeFileSync(alvo, txt);
  console.log(`${(txt.length / 1024 / 1024).toFixed(1)} MB`);
  return txt;
}

// ── CSV do TCU ───────────────────────────────────────────────────────────────
// Delimitador `|`, aspas duplas escapadas por duplicação e campos que contêm
// quebra de linha (o EXCERTO das súmulas tem HTML multi-linha). Um split ingênuo
// por \n picaria o registro no meio, então o parser é caractere a caractere.
function parseCSV(texto) {
  const linhas = [];
  let campo = '';
  let linha = [];
  let dentro = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentro) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else dentro = false;
      } else campo += c;
    } else if (c === '"') dentro = true;
    else if (c === '|') {
      linha.push(campo);
      campo = '';
    } else if (c === '\n') {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else if (c !== '\r') campo += c;
  }
  if (campo || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }
  // A primeira linha do arquivo do TCU pode ser a data de geração (1 coluna só).
  let inicio = 0;
  while (inicio < linhas.length && linhas[inicio].length < 2) inicio++;
  const cab = linhas[inicio].map((h) => h.trim());
  return linhas.slice(inicio + 1).filter((l) => l.length >= cab.length - 1).map((l) => {
    const o = {};
    cab.forEach((h, i) => (o[h] = (l[i] ?? '').trim()));
    return o;
  });
}

// Os portais estaduais publicam acentuação como entidade nomeada
// ("S&uacute;mula N&ordm; 1"), então sem a tabela Latin-1 completa o texto sai
// quebrado e os regexes de número de súmula não casam com nada.
const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ndash: '–', mdash: '—',
  hellip: '…', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', bull: '•', euro: '€' };
('nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn ' +
 'sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave ' +
 'Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ' +
 'ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN ' +
 'szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute ' +
 'icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml ' +
 'yacute thorn yuml').split(' ').forEach((nome, i) => {
  ENTIDADES[nome] = String.fromCharCode(160 + i);
});
ENTIDADES.nbsp = ' ';

function desHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<\s*(br|BR)\s*\/?>/g, '\n')
    .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, e) => ENTIDADES[e] ?? ENTIDADES[e.toLowerCase()] ?? m)
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim();
}

const corta = (s, n) => (s && s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s || '');

// ── acumuladores ─────────────────────────────────────────────────────────────
const IDX = [];
const TXT = {};
/** Campos do índice: [id, tribunal, base, número, título, área, tema, data, situação, destaque] */
function add(id, tribunal, base, numero, titulo, area, tema, data, situacao, destaque, texto) {
  IDX.push([id, tribunal, base, numero, titulo, area, tema, data || null, situacao || null, destaque ? 1 : 0]);
  const t = {};
  for (const k of ['en', 'co', 'ob', 'fp', 'og', 'ur']) if (texto[k]) t[k] = texto[k];
  TXT[id] = t;
}

const TCU_DA = 'https://sites.tcu.gov.br/dados-abertos/jurisprudencia/arquivos';
const redir = (base, key) => `https://pesquisa.apps.tcu.gov.br/redireciona/${base}/${encodeURIComponent(key)}`;

// ── 1. Súmulas do TCU ────────────────────────────────────────────────────────
async function sumulasTCU() {
  const linhas = parseCSV(await baixar(`${TCU_DA}/sumula/sumula.csv`, 'tcu-sumula.csv'));
  let n = 0;
  for (const r of linhas) {
    const numero = parseInt(r.NUMERO, 10);
    if (!numero) continue;
    const vigente = r.VIGENTE === 'true';
    // O enunciado vem com a própria epígrafe embutida ("SÚMULA TCU 292: …"): o
    // título do card já diz isso, então sai daqui para não duplicar.
    const enun = desHtml(r.ENUNCIADO).replace(/^S[ÚU]MULA\s+TCU\s+\d+\s*(\([^)]*\))?\s*:?\s*/i, '').trim();
    if (!enun) continue;
    const excerto = desHtml(r.EXCERTO);
    // O excerto traz "Fundamento legal" e "Precedentes"; o relatório do acórdão
    // que aprovou/revogou vem junto e é longo demais para o card.
    const fund = excerto.split(/\n(?=Relatório:|Voto:|Acórdão:)/)[0];
    const ob = [
      fund && fund.length > 20 ? fund : '',
      r.INDEXACAO ? `Indexação: ${r.INDEXACAO.replace(/^\[|\]$/g, '')}` : '',
    ].filter(Boolean).join('\n\n');
    const aprov = [r.APROVACAO, r.NUMAPROVACAO && `${r.NUMAPROVACAO}/${r.ANOAPROVACAO}`, r.COLEGIADO]
      .filter(Boolean).join(' ');
    add(
      `TCU-SUM-${numero}`, 'TCU', 'Súmula', numero,
      `Súmula ${numero} do TCU${vigente ? '' : ' (revogada)'}`,
      r.AREA || 'Controle externo',
      [r.TEMA, r.SUBTEMA].filter(Boolean).join(' — '),
      r.DATASESSAOFORMATADA, vigente ? null : 'Revogada', vigente,
      {
        en: enun,
        ob: corta(ob, 1600),
        fp: [aprov, r.AUTORTESE && `Rel. ${r.AUTORTESE}`, r.DATASESSAOFORMATADA].filter(Boolean).join(' · '),
        og: 'Tribunal de Contas da União',
        ur: r.KEY ? redir('sumula', r.KEY) : '',
      }
    );
    n++;
  }
  console.log(`  ✓ ${n} súmulas do TCU`);
}

// O acórdão de origem vem numa pseudo-tag <acordao_decisao_tcu colegiado numero ano>.
function acordaoDe(campo) {
  const texto = desHtml(campo);
  const m = /<acordao_decisao_tcu[^>]*colegiado="([^"]*)"[^>]*numero="([^"]*)"[^>]*ano="([^"]*)"/i.exec(campo || '');
  return {
    ref: m ? `Acórdão ${m[2]}/${m[3]} ${m[1]}` : texto.split(',')[0] || '',
    colegiado: m ? m[1] : '',
    linha: texto,
  };
}

// ── 2 a 4. Boletins e informativos do TCU ────────────────────────────────────
// Mesma forma: um enunciado curto (a tese) + o acórdão de origem. O Informativo
// de Licitações e Contratos ainda traz o relato do caso (TEXTOINFO).
async function boletimTCU({ arquivo, nome, prefixo, base, rotulo, area, comCaso }) {
  const linhas = parseCSV(await baixar(`${TCU_DA}/${arquivo}`, nome));
  let n = 0;
  for (const r of linhas) {
    const enun = desHtml(r.ENUNCIADO);
    if (!enun || enun.length < 40) continue;
    const ac = acordaoDe(r.TEXTOACORDAO);
    const numero = parseInt(r.NUMERO || (/(\d+)\s*\/\s*\d{4}/.exec(r.TITULO || '') || [])[1] || '', 10) || null;
    const ano = (/\/(\d{4})/.exec(r.TITULO || '') || [])[1] || '';
    const id = `${prefixo}-${(r.KEY || `${numero}-${n}`).replace(/[^A-Za-z0-9_-]/g, '')}`;
    add(
      id, 'TCU', rotulo, numero,
      ac.ref || desHtml(r.TITULO),
      area,
      corta(enun.split(/(?<=\.)\s/)[0], 120),
      ano, r.TITULO ? desHtml(r.TITULO).replace(/^.*?(\d+\/\d{4}).*$/, '$1') : null, false,
      {
        en: enun,
        co: comCaso ? corta(desHtml(r.TEXTOINFO), 900) : '',
        ob: desHtml(r.REFERENCIA),
        fp: [desHtml(r.TITULO), ac.linha].filter(Boolean).join(' · '),
        ur: r.KEY ? redir(base, r.KEY) : '',
      }
    );
    n++;
  }
  console.log(`  ✓ ${n} enunciados — ${rotulo}`);
}

// ── 5. Súmulas dos TCEs que publicam o texto integral em HTML ────────────────
function linhasDeTexto(html) {
  return desHtml(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ''))
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

async function sumulasTCESP() {
  const html = await baixar('https://www.tce.sp.gov.br/boletim-de-jurisprudencia/sumulas', 'tcesp-sumulas.html');
  let n = 0;
  for (const l of linhasDeTexto(html)) {
    const m = /^S[ÚU]MULA\s*N?[º°.]?\s*(\d+)\s*[-–—]\s*(.+)$/i.exec(l);
    if (!m) continue;
    const numero = +m[1];
    let corpo = m[2].trim();
    const cancelada = /\(CANCELAD[AO]\)/i.test(corpo);
    corpo = corpo.replace(/\s*\(CANCELAD[AO]\)\s*$/i, '').trim();
    if (corpo.length < 25 || TXT[`TCESP-SUM-${numero}`]) continue;
    add(
      `TCESP-SUM-${numero}`, 'TCE-SP', 'Súmula', numero,
      `Súmula ${numero} do TCE-SP${cancelada ? ' (cancelada)' : ''}`,
      'Controle externo', '', '', cancelada ? 'Cancelada' : null, !cancelada,
      {
        en: corpo,
        og: 'Tribunal de Contas do Estado de São Paulo',
        ur: 'https://www.tce.sp.gov.br/boletim-de-jurisprudencia/sumulas',
      }
    );
    n++;
  }
  console.log(`  ✓ ${n} súmulas do TCE-SP`);
}

async function sumulasTCEMG() {
  const html = await baixar('https://www.tce.mg.gov.br/Noticia/Detalhe/67', 'tcemg-sumulas.html');
  const linhas = linhasDeTexto(html);
  let n = 0;
  for (let i = 0; i < linhas.length; i++) {
    // Cabeçalho: "Súmula 128 (Publicada no D.O.C. de …)"; o texto é a linha seguinte.
    const m = /^S[úu]mula\s+(\d+)\s*(\(([^)]*)\))?\s*$/.exec(linhas[i]);
    if (!m) continue;
    const numero = +m[1];
    if (TXT[`TCEMG-SUM-${numero}`]) continue;
    const corpo = linhas[i + 1] || '';
    if (corpo.length < 25 || /^S[úu]mula\s+\d+/.test(corpo) || /^Reda[çc][ãa]o Anterior/i.test(corpo)) continue;
    const hist = (m[3] || '').replace(/\s+/g, ' ').trim();
    const cancelada = /cancelad/i.test(hist);
    add(
      `TCEMG-SUM-${numero}`, 'TCE-MG', 'Súmula', numero,
      `Súmula ${numero} do TCE-MG${cancelada ? ' (cancelada)' : ''}`,
      'Controle externo', '', '', cancelada ? 'Cancelada' : null, !cancelada,
      {
        en: corpo,
        ob: hist ? `Histórico de publicação: ${hist}` : '',
        og: 'Tribunal de Contas do Estado de Minas Gerais',
        ur: 'https://www.tce.mg.gov.br/Noticia/Detalhe/67',
      }
    );
    n++;
  }
  console.log(`  ✓ ${n} súmulas do TCE-MG`);
}

async function sumulasTCEBA() {
  const html = await baixar('https://www.tce.ba.gov.br/legislacao/sumulas', 'tceba-sumulas.html');
  // Aqui o HTML é estruturado: <h3>Súmula nº NN</h3> seguido dos <p> do texto,
  // e há um bloco display:none com os mesmos títulos (índice) que precisa sair.
  const limpo = html.replace(/<div style="display: ?none;">[\s\S]*?<\/div>/gi, '');
  const partes = limpo.split(/<h3[^>]*>/i).slice(1);
  let n = 0;
  for (const p of partes) {
    const m = /^\s*S[úu]mula\s*n?[º°.]?\s*(\d+)\s*<\/h3>([\s\S]*)$/i.exec(p);
    if (!m) continue;
    const numero = +m[1];
    if (TXT[`TCEBA-SUM-${numero}`]) continue;
    const linhas = linhasDeTexto(m[2]).filter((l) => l !== '&nbsp;');
    const corpo = linhas[0] || '';
    if (corpo.length < 25) continue;
    // O TCE-BA abre a súmula com a ementa em caixa alta ("APOSENTADORIA. …").
    const tema = (/^([A-ZÀ-Ú][A-ZÀ-Ú\s.,ÇÃÕÊÉÁÍÓÚÂÔ]{6,}?\.)\s/.exec(corpo) || [])[1] || '';
    add(
      `TCEBA-SUM-${numero}`, 'TCE-BA', 'Súmula', numero,
      `Súmula ${numero} do TCE-BA`,
      'Controle externo',
      tema ? tema.replace(/\.$/, '') : '', '', null, true,
      {
        en: corpo,
        ob: linhas.slice(1, 4).join('\n'),
        og: 'Tribunal de Contas do Estado da Bahia',
        ur: 'https://www.tce.ba.gov.br/legislacao/sumulas',
      }
    );
    n++;
  }
  console.log(`  ✓ ${n} súmulas do TCE-BA`);
}

// ── execução ─────────────────────────────────────────────────────────────────
console.log('Central de Contas — coletando acervo oficial');
await sumulasTCU();
await boletimTCU({
  arquivo: 'boletim-jurisprudencia/boletim-jurisprudencia.csv', nome: 'tcu-boletim-jurisprudencia.csv',
  prefixo: 'TCU-BJ', base: 'boletim-jurisprudencia', rotulo: 'Boletim de Jurisprudência',
  area: 'Controle externo', comCaso: false,
});
await boletimTCU({
  arquivo: 'boletim-pessoal/boletim-pessoal.csv', nome: 'tcu-boletim-pessoal.csv',
  prefixo: 'TCU-BP', base: 'boletim-pessoal', rotulo: 'Boletim de Pessoal',
  area: 'Pessoal', comCaso: false,
});
await boletimTCU({
  arquivo: 'boletim-informativo-lc/informativo-lc.csv', nome: 'tcu-informativo-lc.csv',
  prefixo: 'TCU-ILC', base: 'informativo-lc', rotulo: 'Informativo de Licitações e Contratos',
  area: 'Licitação', comCaso: true,
});
await sumulasTCESP();
await sumulasTCEMG();
await sumulasTCEBA();

// Ordem de leitura: as súmulas (que valem para sempre) primeiro, depois os
// boletins do mais novo para o mais antigo — sem isso a lista abria em 2014.
const ORDEM_TRIB = { TCU: 0, 'TCE-SP': 1, 'TCE-MG': 2, 'TCE-BA': 3 };
const ORDEM_BASE = { 'Súmula': 0, 'Boletim de Jurisprudência': 1, 'Boletim de Pessoal': 2,
                     'Informativo de Licitações e Contratos': 3 };
const ano = (r) => {
  const d = String(r[7] || '');
  return +((/(\d{4})$/.exec(d) || /^(\d{4})$/.exec(d) || [0, 0])[1]);
};
IDX.sort((a, b) =>
  (ORDEM_TRIB[a[1]] ?? 9) - (ORDEM_TRIB[b[1]] ?? 9) ||
  (ORDEM_BASE[a[2]] ?? 9) - (ORDEM_BASE[b[2]] ?? 9) ||
  (a[2] === 'Súmula' ? (a[3] || 0) - (b[3] || 0) : ano(b) - ano(a) || (b[3] || 0) - (a[3] || 0))
);

const stamp = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(ROOT, 'contas-index.js'),
  `// Gerado por scripts/build-contas.mjs em ${stamp}. Não editar à mão.\n` +
    `window.__CONTAS_IDX__=${JSON.stringify(IDX)};\n` +
    `window.__CONTAS_META__={atualizado:"${stamp}"};\n`
);
writeFileSync(
  join(ROOT, 'contas-text.js'),
  `// Gerado por scripts/build-contas.mjs em ${stamp}. Não editar à mão.\n` +
    `window.__CONTAS_TXT__=${JSON.stringify(TXT)};\n`
);

const mb = (f) => (statSync(join(ROOT, f)).size / 1024 / 1024).toFixed(2);
console.log(`\n${IDX.length} verbetes → contas-index.js (${mb('contas-index.js')} MB) + contas-text.js (${mb('contas-text.js')} MB)`);
