/* JURIS — O QUADRO "NÃO CONFUNDA COM" (15/09/2026; ampliado em 17/09/2026)

   "Relacionados" era uma lista de rótulos opacos ("STF · Tema 1282 (RG)") que fingia
   comparar: o que engana na prova é justamente a semelhança, e a lista não diz em que os
   vizinhos DIFEREM. No lugar dela o roteiro passa a montar um quadro — o verbete aberto na
   primeira coluna, até dois vizinhos confundíveis ao lado, e só as linhas em que eles se
   separam. O que se prova aqui, medindo (presença no DOM não prova nada — foi assim que o
   painel do MAPA passou sete casos verdes estando invisível):

   Os oito casos do contrato (seção 7 do CONTRATO-QUADRO):
   · (1) o quadro PINTA: uma coluna por tema, a primeira marcada como a do verbete aberto —
         e ela se distingue por borda inteira tingida + lavagem, nunca por faixa lateral, e
         nunca só pela cor (o cabeçalho também diz por escrito que é ela);
   · (2) linha constante NÃO entra: "Fundamento" vem igual nas três colunas, escrito de três
         jeitos diferentes ("CF, art. 145, II" · "CF, ART. 145, II." · "cf art 145 ii"), e
         some — prova de que a comparação é por texto NORMALIZADO, como manda o contrato.
         Linha com um valor só também some. E (2b) o teto de 6 linhas corta pela ordem
         canônica, não pela ordem em que a IA escreveu;
   · (3) a divergência fica travada: as frases "Não confunda" pintam, o HTML que vier no
         texto sai escapado, e na linha que carrega o eixo nenhum par de colunas repete o
         valor;
   · (4) cabe a 390 px (nada passa da borda, a página e o documento não rolam de lado, as
         colunas EMPILHAM, todo alvo dá 44 px ao dedo) e a 1280 px fica lado a lado;
   · (5) contraste calculado ≥ 4,5:1 de rótulo e de valor no claro E no modo imersão
         (#jrDark), e o modo leitura (#jrLeitura) aumenta o corpo da célula;
   · (6) retrocompatível: roteiro v1 (sem `q`) ainda pinta a lista antiga COM a caixa — o
         seletor migrado não ficou órfão — e oferece o botão que monta só o quadro;
   · (7) o quadro continua fora do sync: mora em `catedraJurisRoteiros`, sem o prefixo
         `catedra:` que o auth.js sobe para a nuvem;
   · (8) o contrato do prompt sobrevive: `promptQuadro` continua proibindo número inventado,
         exigindo o id copiado da lista e os rótulos na ordem canônica.

   Os seis que a revisão adversarial pediu (cada um nasceu de um defeito que passava verde):
   · (9)  payload HOSTIL da IA: "naoConfunda" e "semCerteza" em STRING, e listas com letras
          soltas. O laço antigo iterava os caracteres e a trava pintava <p>S</p><p>e</p>.
          Passa pela VALIDAÇÃO de verdade (a resposta vai pela ponte ctIA, como no app) e pelo
          RENDER de um registro já gravado assim; mede que todo parágrafo da trava tem mais de
          três palavras, que o rodapé não repete "Confira:" e que o gravado ficou limpo;
   · (10) duplicata: dois verbetes da MESMA família (Jurisprudência em Teses, informativo —
          onde o "número" é a edição) NÃO se descartam como duplicata, nem na lista de
          candidatos nem na validação; e a duplicata REAL (o mesmo tema em dois registros,
          …-1112 e …-1112-2) continua fora. Também o mesmo julgado republicado em dois
          arquivos de informativo (ver o caso: ele fica vermelho enquanto o defeito existir);
   · (11) transbordo: cabeçalho longo e valor com palavra gigante não passam da borda da
          coluna, COM subgrid e SEM (o ramo do motor que não o tem), a 390, 800 e 1280 px.
          A medida é da CAIXA DO TEXTO (Range), não do elemento: um bloco não cresce com a
          palavra que transborda dele, e medir só o elemento dava verde com o texto por fora;
   · (12) os três desfechos sem quadro dizem coisas DIFERENTES na tela — o acervo não tem
          vizinho × a IA disse que nada é confundível × a IA falhou — e só o último oferece
          "tente de novo";
   · (13) acessibilidade: o nome acessível do cabeçalho da coluna aberta traz a data e a marca
          "o verbete aberto" (o aria-label SUBSTITUI o conteúdo, e antes apagava as duas);
   · (14) contraste medido SOBRE a coluna aberta: o fundo dela tem gradiente (a lavagem), e a
          medida antiga só lia background-color — o texto da coluna que mais importa era o
          único medido contra um fundo que não é o dele. Varre as cores de todos os ramos.

   SEMENTE PELA /__semente, SEMPRE. O mapa `ROT` é lido UMA VEZ no boot do satélite
   (juris-web.html: `try{ ROT=JSON.parse(localStorage.getItem(RK))||{} }`): escrever a chave
   com a página já aberta não tem efeito nenhum. Então: /__semente → escrever → abrir a
   página → abrir o verbete. Os casos (1)–(8), (11), (13) e (14) semeiam o quadro pronto,
   que é o que permite fabricar de propósito a linha constante, o teto e a célula ausente.
   Os casos (9), (10) e (12) precisam da validação e dos estados de verdade: o satélite roda
   dentro de um <iframe> (como no app) e a página de fora faz o papel do app, respondendo a
   ponte ctIA com o que o caso manda. Nenhuma IA de verdade é chamada.

   Execução avulsa: `CT_PORT=8145 node tests/juris-quadro.mjs`
   (CT_BROWSER=webkit roda o mesmo roteiro no motor da Apple.) */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* A ordem canônica da seção 3 do contrato, que o prompt pede e o render respeita. */
const ORDEM = ['quandoIncide', 'quemAlcanca', 'teseFixada', 'efeitoPratico', 'excecoes',
  'desdeQuando', 'situacaoHoje', 'fundamento', 'separa'];

/* 105 letras sem um espaço. "inconstitucionalidade" aparece 628 vezes no acervo; cinco dela
   coladas passam de qualquer coluna. O tamanho cabe nos tetos do render (120 no cabeçalho,
   180 na célula): acima deles o qdTxt corta a palavra INTEIRA fora ("…"), e o caso passaria
   sem palavra gigante nenhuma na tela. */
const GIGANTE = 'inconstitucionalidade'.repeat(5);

/* Os ids saem do acervo de verdade, lidos do índice em tempo de execução: escrever
   'TJRO-SUM-1' à mão quebraria calado no dia em que os scripts de informativos
   regerarem o acervo e mudarem a ordem. Só os primeiros bytes do arquivo são lidos —
   ele tem 2,5 MB e cada entrada começa por `["<id>"`. */
function idsDoAcervo(quantos) {
  const cru = fs.readFileSync(path.join(RAIZ, 'juris-index.js'), 'utf8').slice(0, 12000);
  const ids = []; const re = /\["([^"]+)"/g; let m;
  while (ids.length < quantos && (m = re.exec(cru))) ids.push(m[1]);
  return ids;
}

/* As cores de identidade que o leitor pode receber em --rc: as de ramoColor e as de
   areaColor (as facetas do TCU), lidas do próprio juris-web.html. Cor nova num ramo entra
   na varredura sozinha, sem ninguém lembrar de atualizar este arquivo. */
function paletaDosRamos() {
  let fonte = '';
  try { fonte = fs.readFileSync(path.join(RAIZ, 'juris-web.html'), 'utf8'); } catch (_) {}
  const cores = new Set();
  for (const nome of ['ramoColor', 'areaColor']) {
    const i = fonte.indexOf('function ' + nome + '(');
    if (i < 0) continue;
    const corpo = fonte.slice(i, fonte.indexOf('\n  }', i));
    for (const m of corpo.matchAll(/'(#[0-9a-fA-F]{6})'/g)) cores.add(m[1].toUpperCase());
  }
  return [...cores];
}

/* O mesmo julgado REPUBLICADO em dois registros de informativo: as coletâneas de 2020 e de
   2021 trazem os mesmos julgados do Info 684 do STJ com ids diferentes, o mesmo título
   genérico ("Info 684 · STJ"), o mesmo assunto, a mesma data — e o MESMO enunciado. Para achar
   os pares é preciso o texto, que não está no índice: lê-se das fatias de dados/juris-text
   (estão no git). Enunciado igual = ≥ 90% das palavras de 4+ letras do menor contidas no maior. */
let _acervo = null;
function acervoInteiro() {
  if (_acervo) return _acervo;
  try {
    const ctx = { window: {} }; vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(RAIZ, 'juris-index.js'), 'utf8'), ctx);
    _acervo = ctx.window.__JURIS_IDX__ || [];
  } catch (_) { _acervo = []; }
  return _acervo;
}

/* A duplicata REAL do acervo: o mesmo tema em dois registros (…-1112 e …-1112-2), com o mesmo
   assunto, o mesmo ramo e o mesmo tribunal. Sem a trava, o registro gêmeo divide TODOS os
   termos com o original e seria o primeiro candidato da lista — então a ausência dele prova a
   trava, não o acaso do ranking. */
function duplicataReal() {
  const X = acervoInteiro(), por = {};
  for (const x of X) por[x[0]] = x;
  for (const x of X) {
    if (!/-2$/.test(x[0])) continue;
    const o = por[x[0].slice(0, -2)];
    if (o && o[6] && o[6] === x[6] && o[5] === x[5] && o[1] === x[1]) return { original: o[0], copia: x[0] };
  }
  return null;
}

function republicacoes(quantos) {
  const out = [];
  try {
    const X = acervoInteiro();
    const dir = path.join(RAIZ, 'dados', 'juris-text'), T = {};
    for (const f of fs.readdirSync(dir)) {
      if (!/\.json$/.test(f)) continue;
      const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      Object.assign(T, j.textos || j);
    }
    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    const palavras = (s) => new Set(norm(s).split(' ').filter(w => w.length > 3));
    const grupos = {};
    for (const r of X) {
      if (!/^informativo_/.test(r[2]) || !/^(?:(?:stf|stj|tse) · )?info \d+(?: · (?:stf|stj|tse))?$/i.test(String(r[4] || '').trim())) continue;
      const k = r[1] + '|' + r[3] + '|' + norm(r[6]) + '|' + r[7];
      (grupos[k] = grupos[k] || []).push(r[0]);
    }
    for (const k of Object.keys(grupos)) {
      const g = grupos[k];
      for (let a = 0; a < g.length && out.length < quantos; a++) for (let b = a + 1; b < g.length && out.length < quantos; b++) {
        const A = palavras((T[g[a]] || {}).en), B = palavras((T[g[b]] || {}).en);
        if (A.size < 8 || B.size < 8) continue;
        let comum = 0; for (const w of A) if (B.has(w)) comum++;
        if (comum / Math.min(A.size, B.size) >= 0.9) out.push({ a: g[a], b: g[b] });
      }
      if (out.length >= quantos) break;
    }
  } catch (_) {}
  return out;
}

/* O quadro semeado do primeiro verbete. É fabricado de propósito para ter, ao mesmo tempo:
   três colunas; uma linha que DIFERE nas três (quandoIncide, a do eixo); uma que coincide
   em duas e difere na terceira (quemAlcanca — o contrato §4.1 manda renderizar, basta um par
   diferente); uma linha constante escrita de três jeitos (fundamento, que tem de sumir); uma
   linha de um valor só (situacaoHoje, que também some); e uma com célula ausente numa coluna
   (excecoes), para o lugar vazio continuar alinhando os rótulos. */
function quadroPrincipal(ids) {
  return {
    objeto: 'Taxa cobrada pelo serviço de combate a incêndio',
    eixo: 'ente que institui a taxa',
    fonte: 'ia',
    colunas: [
      { id: ids[0], ref: 'STF · Repercussão Geral · nº 1282', data: '26/03/2025', aberto: true,
        celulas: {
          quandoIncide: 'lei MUNICIPAL institui a taxa de combate a sinistros',
          quemAlcanca: 'alcança quem tem imóvel no município; não alcança a União',
          teseFixada: 'É inconstitucional a taxa municipal de combate a sinistros',
          efeitoPratico: 'o tributo é afastado e o valor recolhido volta',
          excecoes: 'salvo a contribuição de iluminação pública',
          fundamento: 'CF, art. 145, II' } },
      { id: ids[1], ref: 'STF · Repercussão Geral · nº 1085', data: '26/03/2025', aberto: false,
        celulas: {
          quandoIncide: 'lei ESTADUAL institui a taxa pelo serviço do Corpo de Bombeiros',
          quemAlcanca: 'alcança quem tem imóvel no município; não alcança a União',
          teseFixada: 'É constitucional a taxa estadual de prevenção e combate a incêndio',
          efeitoPratico: 'a cobrança é mantida',
          excecoes: 'salvo o imóvel rural fora da área urbanizada',
          fundamento: 'CF, ART. 145, II.' } },
      { id: ids[2], ref: 'STJ · Recurso Repetitivo · nº 1123', data: '19/02/2025', aberto: false,
        celulas: {
          quandoIncide: 'seguradora paga o sinistro e cobra do causador do dano',
          quemAlcanca: 'alcança a seguradora sub-rogada; não alcança o consumidor',
          teseFixada: 'A sub-rogação não transfere a prerrogativa de foro do consumidor',
          efeitoPratico: 'a ação corre no foro do réu',
          situacaoHoje: 'vigente',
          fundamento: 'cf art 145 ii' } },
    ],
    naoConfunda: [
      'Se quem institui a taxa é o Município, é o Tema 1282 e a cobrança cai. Se é o Estado, '
      + 'é o Tema 1085 e a cobrança fica. O que decide é o ente que institui, não o nome do serviço.',
      'Se a discussão é sobre quem paga o tributo, é matéria constitucional. Se é sobre quem '
      + 'reembolsa o sinistro, é o repetitivo do STJ. O que decide é o objeto da cobrança, não a palavra incêndio.',
    ],
    mesmoAssunto: [{ id: ids[3], ref: 'STF · Súmula Vinculante · nº 41' }],
    semCerteza: ['Confira: a data de publicação do acórdão no Diário.'],
  };
}

/* O segundo quadro semeado existe para dois casos que o primeiro não cobre: o TETO de 6
   linhas (aqui as NOVE chaves discriminam, e só as seis primeiras da ordem canônica podem
   pintar) e o escape — o `objeto` vem com marcação HTML, que tem de sair como texto. */
function quadroDoTeto(ids) {
  const cel = (s) => ({
    quandoIncide: 'gatilho ' + s, quemAlcanca: 'alcance ' + s, teseFixada: 'tese ' + s,
    efeitoPratico: 'efeito ' + s, excecoes: 'salvo ' + s, desdeQuando: 'desde ' + s,
    situacaoHoje: 'situação ' + s, fundamento: 'fundamento ' + s, separa: 'separa ' + s,
  });
  return {
    objeto: 'Nove eixos de uma vez <b>sem tag nenhuma</b> na tela',
    eixo: 'a variável que separa',
    fonte: 'ia',
    colunas: [
      { id: ids[1], ref: 'STF · Repercussão Geral · nº 900', data: '01/02/2025', aberto: true, celulas: cel('A') },
      { id: ids[3], ref: 'STJ · Recurso Repetitivo · nº 901', data: '02/03/2025', aberto: false, celulas: cel('B') },
    ],
    naoConfunda: ['Se a variável é A, é o primeiro. Se é B, é o segundo. O que decide é a variável, não a semelhança.'],
    mesmoAssunto: [],
    semCerteza: [],
  };
}

/* (11) O quadro que TRANSBORDARIA: cabeçalho de 116 caracteres com a palavra gigante no meio,
   célula com ela, e ela também na frase da trava, no contexto, no "Do mesmo assunto" e no
   rodapé — todo texto do bloco vem de uma IA que ninguém revisa. Em três colunas (a grade de
   três trilhos) e em duas (a de dois, que tem regra própria no container query). */
function quadroQueTransborda(ids, n) {
  return {
    fonte: 'ia',
    objeto: 'Objeto ' + GIGANTE,
    eixo: 'eixo ' + GIGANTE.slice(0, 70),
    colunas: ids.slice(0, n).map((id, i) => ({
      id, aberto: i === 0,
      ref: 'STF · ' + GIGANTE.slice(0, 100) + ' · nº 128' + i,
      data: '0' + (i + 1) + '/02/2025',
      celulas: { quandoIncide: 'gatilho ' + i + ' ' + GIGANTE, teseFixada: 'tese ' + i + ' curta',
        efeitoPratico: GIGANTE + ' efeito ' + i },
    })),
    naoConfunda: ['Se a variável é ' + GIGANTE + ', é o primeiro tema. O que decide é a variável.'],
    mesmoAssunto: [{ id: ids[7], ref: 'vizinho ' + GIGANTE }],
    semCerteza: ['Confira: ' + GIGANTE],
  };
}

/* (9) O registro GRAVADO com as listas em string — o que a validação antiga deixava passar e
   que continua no localStorage de quem usou a versão anterior. O render tem de passá-lo pelas
   mesmas réguas antes de pintar. */
const TRAVA_EM_STRING = 'Se quem institui a taxa é o Município, é o Tema 1282 e a cobrança cai. '
  + 'Se é o Estado, é o Tema 1085 e a cobrança fica.';
function quadroGravadoEmString(ids) {
  const q = quadroPrincipal(ids);
  q.colunas = q.colunas.slice(0, 2);
  q.naoConfunda = TRAVA_EM_STRING;
  q.semCerteza = 'Confira: a data de publicação do acórdão no Diário.';
  return q;
}
/* …e o gravado com as listas em LETRAS: o resultado exato do laço antigo sobre uma string. */
function quadroGravadoEmLetras(ids) {
  const q = quadroPrincipal(ids);
  q.colunas = q.colunas.slice(0, 2);
  q.naoConfunda = ['S', 'e', ' ', 'q', 'u', 'ambos', 'a diferença', TRAVA_EM_STRING];
  q.semCerteza = ['C', 'o', 'n', 'Confira: a data de publicação do acórdão no Diário.', '42'];
  return q;
}

/* Semente inteira: verbete 0 com o quadro, verbete 1 com o quadro do teto, verbete 2 com um
   roteiro v1 (sem `q`) — o caso da retrocompatibilidade —, 4 e 5 com os quadros que
   transbordariam (três e duas colunas), 6 e 7 com os gravados hostis. Um só mapa, uma só
   abertura de página: trocar de verbete é `openVerbete(i)`, e renderEstudo roda de novo. */
function semente(ids) {
  const base = { ts: Date.now(), nivel: 2, frase: 'Tese em uma frase.',
    fundamento: 'CF, art. 145, II.', decidiu: 'Decidiu isso.', chave: ['um', 'dois'] };
  const reg = {};
  reg[ids[0]] = Object.assign({}, base, { v: 2, q: quadroPrincipal(ids),
    jurisprudencia: ['STF · Tema 1085', 'STJ · Tema 1123'] });
  reg[ids[1]] = Object.assign({}, base, { v: 2, q: quadroDoTeto(ids), jurisprudencia: [] });
  reg[ids[2]] = Object.assign({}, base, { jurisprudencia: ['STF · Tema 1085', 'STJ · Tema 1123'] });
  reg[ids[4]] = Object.assign({}, base, { v: 2, q: quadroQueTransborda(ids.slice(4).concat(ids), 3), jurisprudencia: [] });
  reg[ids[5]] = Object.assign({}, base, { v: 2, q: quadroQueTransborda(ids.slice(5).concat(ids), 2), jurisprudencia: [] });
  reg[ids[6]] = Object.assign({}, base, { v: 2, q: quadroGravadoEmString(ids.slice(6).concat(ids)), jurisprudencia: [] });
  reg[ids[7]] = Object.assign({}, base, { v: 2, q: quadroGravadoEmLetras(ids.slice(7).concat(ids)), jurisprudencia: [] });
  return reg;
}

/* Espera a CONDIÇÃO, não o relógio: sob carga (a suíte inteira roda com o navegador
   ocupado) tempo fixo vira flake. Devolve true/false — quem chama transforma o false em
   falha NOMEADA, nunca em exceção que derruba a suíte. Serve a página e ao frame. */
async function esperar(alvo, fn, arg, ms = 8000) {
  try { await alvo.waitForFunction(fn, arg, { timeout: ms, polling: 100 }); return true; }
  catch (_) { return false; }
}

async function abrirPagina(ctx, base, sem) {
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(String((e && e.message) || e)));
  // /__semente é 404 da MESMA origem: escreve-se o storage numa página SEM o app, porque o
  // mapa ROT do satélite é lido uma única vez, no boot.
  await page.goto(base + '/__semente');
  await page.evaluate((s) => {
    try { localStorage.clear(); localStorage.setItem('catedraJurisRoteiros', JSON.stringify(s)); } catch (_) {}
  }, sem);
  await page.goto(base + '/juris-web.html');
  const pronto = await esperar(page, () => typeof window.openVerbete === 'function'
    && !!window.__JURIS_IDX__ && document.querySelectorAll('.vcard').length > 0, null, 25000);
  return { page, erros, pronto };
}

/* Abre o verbete pelo índice e espera o roteiro do verbete NOVO. A espera é por identidade
   de nó: #jrEstudo é recriado a cada renderVerbete, então esperar só pelo seletor casaria
   com o quadro do verbete anterior, que ainda está na tela. */
async function abrirVerbete(page, i) {
  await page.evaluate(() => { window.__ctHostAnterior = document.getElementById('jrEstudo') || null; });
  await page.evaluate((k) => window.openVerbete(k), i);
  // 12 s, e não os 1600 ms fixos do bloco JURIS da suíte: openVerbete cai no caminho
  // assíncrono quando o texto do verbete ainda não está em memória (pinta .rdr-spin e busca
  // a fatia), e sob carga o tempo fixo vira flake.
  return esperar(page, () => {
    const h = document.getElementById('jrEstudo');
    return !!(h && h !== window.__ctHostAnterior && h.querySelector('.estWrap'));
  }, null, 12000);
}

/* ---------- estrutura e geometria do quadro, medidas na página ---------- */
async function medirEstrutura(page) {
  return page.evaluate(() => {
    const q = document.querySelector('[data-qd="quadro"]');
    if (!q) return { achou: false };
    const cols = [...q.querySelectorAll('.qdCol')];
    const cs = (el) => getComputedStyle(el);
    const linhasDaCol = (c) => [...c.querySelectorAll('[data-qd-lin]')].map(e => e.getAttribute('data-qd-lin'));
    const porLinha = {};
    for (const ch of new Set(cols.flatMap(linhasDaCol))) {
      const celulas = cols.map(c => c.querySelector('[data-qd-lin="' + ch + '"]'));
      porLinha[ch] = {
        celulas: celulas.filter(Boolean).length,
        valores: celulas.map(c => { const v = c && c.querySelector('.qdVal'); return v ? v.textContent.trim() : ''; }),
        vaziasEscondidas: celulas.filter(c => c && !c.querySelector('.qdVal') && c.getAttribute('aria-hidden') === 'true').length,
        rotulos: celulas.map(c => { const r = c && c.querySelector('.qdRot'); return r ? r.textContent.trim() : ''; }),
        toposDoRotulo: celulas.map(c => { const r = c && c.querySelector('.qdRot');
          return r ? Math.round(r.getBoundingClientRect().top) : null; }),
      };
    }
    const c0 = cols[0] ? cs(cols[0]) : null, c1 = cols[1] ? cs(cols[1]) : null;
    // "passa da borda" só conta quando nada corta o elemento de propósito até a raiz.
    const contido = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const e = cs(p);
        if (e.overflowX !== 'visible' || e.textOverflow === 'ellipsis') return true;
      }
      return false;
    };
    const vazando = [...q.querySelectorAll('*')].filter(el => {
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.right > innerWidth + 1 && !contido(el);
    });
    const alvos = [...q.querySelectorAll('button')].map(b => {
      const r = b.getBoundingClientRect(), af = cs(b, '::after');
      return { cls: String(b.className).split(' ')[0], alt: Math.round(r.height), larg: Math.round(r.width),
        area: Math.round(parseFloat(af.height) || 0), areaL: Math.round(parseFloat(af.width) || 0) };
    });
    const doc = document.querySelector('.rdr .doc');
    const grade = q.querySelector('.qdGrade');
    return {
      achou: true,
      cols: cols.length,
      ordem: cols.map(c => c.getAttribute('data-qd-col')),
      abertos: [...q.querySelectorAll('[data-qd-aberto="1"]')].map(c => c.getAttribute('data-qd-col')),
      classeAberta: cols.map(c => c.classList.contains('aberta')),
      palavraAberta: cols.map(c => { const e = c.querySelector('.qdCab em'); return e ? e.textContent.trim() : ''; }),
      cabecalhos: cols.map(c => { const b = c.querySelector('.qdCab b'); return b ? b.textContent.trim() : ''; }),
      datas: cols.map(c => { const s = c.querySelector('.qdCab small'); return s ? s.textContent.trim() : ''; }),
      clicaveis: cols.map(c => !!c.querySelector('button.qdCab[data-qd-id]')),
      idsDasColunas: cols.map(c => { const b = c.querySelector('[data-qd-id]'); return b ? b.getAttribute('data-qd-id') : ''; }),
      linhasDom: cols[0] ? linhasDaCol(cols[0]) : [],
      porLinha,
      textoDoQuadro: q.textContent,
      tagsNoQuadro: q.querySelectorAll('.qdCtx b, .qdTrava b, .qdVal b').length,
      semListaAntiga: document.querySelectorAll('#jrEstudo .estJur').length === 0,
      trava: [...q.querySelectorAll('.qdTrava p')].map(p => p.textContent.trim()),
      mais: [...q.querySelectorAll('.qdMais li')].map(li => li.textContent.trim()),
      rodape: (q.querySelector('.estFonte') || {}).textContent || '',
      // a marca da coluna aberta: borda INTEIRA tingida + lavagem, nunca faixa lateral de
      // 3-4 px e nunca box-shadow de deslocamento zero
      borda: c0 ? c0.borderTopColor : '', bordaOutra: c1 ? c1.borderTopColor : '',
      larguraDasBordas: c0 ? [c0.borderTopWidth, c0.borderRightWidth, c0.borderBottomWidth, c0.borderLeftWidth] : [],
      lavagem: c0 ? c0.backgroundImage.slice(0, 15) : '',
      sombra: c0 ? c0.boxShadow : 'none',
      topos: cols.map(c => Math.round(c.getBoundingClientRect().top)),
      direitas: cols.map(c => Math.round(c.getBoundingClientRect().right)),
      trilhos: grade ? cs(grade).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      subgrid: CSS.supports('grid-template-rows', 'subgrid'),
      vazando: vazando.slice(0, 3).map(el => el.tagName + '.' + String(el.className).split(' ')[0]
        + ' r=' + Math.round(el.getBoundingClientRect().right)),
      alvos,
      janela: innerWidth,
      rolaPagina: document.documentElement.scrollWidth - innerWidth,
      rolaDoc: doc ? doc.scrollWidth - doc.clientWidth : 0,
    };
  });
}

/* ---------- tinta: o cálculo de contraste, instalado uma vez por página ----------
   Dentro do leitor quase toda superfície é translúcida, e o fundo de um texto é a PILHA de
   tudo o que está atrás dele. Duas correções sobre a medida antiga:
   · background-image ENTRA na pilha. A coluna do verbete aberto é pintada por uma lavagem em
     gradiente (color-mix da cor do ramo a 18% → transparente) POR CIMA do cartão; a medida
     antiga só lia background-color e media o texto dessa coluna contra o cartão branco puro.
     Cada gradiente vira uma camada cujas alternativas são as suas paradas de cor, e o
     contraste é o PIOR de todas as combinações — o texto que começa na borda esquerda assenta
     justamente sobre a parada mais tingida.
   · a pilha para no .rdr. O palco é GRADIENTE, com backgroundColor transparente: subir até
     achar cor sólida atravessava o palco e media contra o corpo claro da página — 1,06:1 falso
     no modo imersão. Ela assenta sobre as duas pontas do gradiente do palco (--rcanA e --rcanB)
     e fica com a pior. (O brilho radial do palco, com a cor do ramo, NÃO entra: ele mora nos
     cantos e a conta combinada com a lavagem da coluna esquerda seria um fundo que não existe.)
   color-mix() e color() serializam como color(srgb …) no valor computado: lidos direto, e o
   que não for dessas sintaxes o próprio motor resolve numa sonda. */
async function instalarTinta(alvo) {
  await alvo.evaluate(() => {
    if (window.__ctTinta) return;
    const cv = document.createElement('canvas'); cv.width = cv.height = 1;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    const sonda = document.createElement('i'); sonda.style.display = 'none'; document.body.appendChild(sonda);
    const num = (v, escala) => { v = String(v).trim(); return /%$/.test(v) ? parseFloat(v) / 100 * (escala || 1) : parseFloat(v); };
    const cor = (s, fundo) => {
      s = String(s || '').trim();
      let m = /^rgba?\(([^)]*)\)$/i.exec(s);
      if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean);
        return [num(p[0], 255), num(p[1], 255), num(p[2], 255), p.length > 3 ? num(p[3]) : 1]; }
      m = /^color\(srgb\s+([^)]*)\)$/i.exec(s);
      if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean);
        return [num(p[0]) * 255, num(p[1]) * 255, num(p[2]) * 255, p.length > 3 ? num(p[3]) : 1]; }
      if (/^transparent$/i.test(s)) return [0, 0, 0, 0];
      if (!s || fundo) return null;
      sonda.style.backgroundColor = ''; sonda.style.backgroundColor = s;
      const r = getComputedStyle(sonda).backgroundColor;
      if (r && r !== s) { const v = cor(r, true); if (v) return v; }
      try { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1);
        const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; } catch (_) { return null; }
    };
    const paradas = (img) => {
      if (!img || img === 'none' || img.indexOf('gradient') < 0) return [];
      const toks = img.match(/color-mix\((?:[^()]|\([^()]*\))*\)|color\([^()]*\)|rgba?\([^()]*\)|#[0-9a-fA-F]{3,8}\b|\btransparent\b/g) || [];
      return toks.map(t => cor(t)).filter(Boolean);
    };
    const bases = () => {
      const rdr = document.querySelector('.rdr');
      if (!rdr) return [[255, 255, 255]];
      const e = getComputedStyle(rdr);
      const b = [cor(e.getPropertyValue('--rcanA')), cor(e.getPropertyValue('--rcanB'))]
        .filter(Boolean).map(p => [p[0], p[1], p[2]]);
      return b.length ? b : [[255, 255, 255]];
    };
    // camadas do texto para baixo, cada uma com as alternativas de cor que ela pode ter ali
    const camadas = (el, semGradiente) => {
      const out = [];
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        if (n.classList && n.classList.contains('rdr')) break;
        const e = getComputedStyle(n);
        const g = semGradiente ? [] : paradas(e.backgroundImage);
        if (g.some(p => p[3] > 0.001)) out.push(g);          // a imagem pinta POR CIMA da cor do mesmo elemento
        const c = cor(e.backgroundColor);
        if (c && c[3] > 0) { out.push([c]); if (c[3] >= 0.999) break; }
      }
      return out;
    };
    const sobre = (lista, base) => {
      let [r, g, b] = base;
      for (let i = lista.length - 1; i >= 0; i--) { const [R, G, B, A] = lista[i];
        r = R * A + r * (1 - A); g = G * A + g * (1 - A); b = B * A + b * (1 - A); }
      return [r, g, b];
    };
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const razao = (fg, bg) => { const a = lum(fg) + 0.05, b = lum(bg) + 0.05; return a > b ? a / b : b / a; };
    const pior = (el, semGradiente) => {
      if (!el) return null;
      const c = cor(getComputedStyle(el).color);
      if (!c) return null;
      let combos = [[]];
      for (const alts of camadas(el, semGradiente)) {
        const novo = [];
        for (const k of combos) for (const a of alts) novo.push(k.concat([a]));
        combos = novo.slice(0, 512);
      }
      let menor = Infinity;
      for (const base of bases()) for (const k of combos) {
        const bg = sobre(k, base);
        const fg = [0, 1, 2].map(i => c[i] * c[3] + bg[i] * (1 - c[3]));
        menor = Math.min(menor, razao(fg, bg));
      }
      return +menor.toFixed(2);
    };
    window.__ctTinta = { cor, paradas, camadas, pior };
  });
}

async function medirTinta(page) {
  await instalarTinta(page);
  return page.evaluate(() => {
    const T = window.__ctTinta;
    const pior = (sel) => T.pior(document.querySelector(sel));
    const corpo = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const e = getComputedStyle(el);
      return { fs: Math.round(parseFloat(e.fontSize) * 10) / 10, familia: e.fontFamily.split(',')[0].replace(/"/g, '') };
    };
    return {
      escuro: !!document.querySelector('.rdr.dark'),
      leitura: !!document.querySelector('.rdr.leitura'),
      contraste: {
        rotulo: pior('[data-qd="quadro"] .qdCel .qdRot'),
        valor: pior('[data-qd="quadro"] .qdCel .qdVal'),
        cabecalho: pior('[data-qd="quadro"] .qdCab b'),
        data: pior('[data-qd="quadro"] .qdCab small'),
        contexto: pior('[data-qd="quadro"] .qdCtx .qdVal'),
        trava: pior('[data-qd="quadro"] .qdTrava p'),
      },
      rodape: pior('[data-qd="quadro"] .estFonte'),
      // diagnóstico: o rodapé do roteiro INTEIRO usa a mesma classe e a mesma tinta do host
      // (.estFonte → var(--text2)). Medir os dois lado a lado é o que diz se um vermelho no
      // rodapé do quadro é defeito novo ou dívida que o bloco herdou.
      rodapeDoRoteiro: pior('#jrEstudo .estWrap > .estFonte'),
      valor: corpo('[data-qd="quadro"] .qdCel .qdVal'),
      caixa: getComputedStyle(document.querySelector('[data-qd="quadro"] .estCaixa')).backgroundColor,
    };
  });
}

/* (14) O texto da coluna ABERTA, sobre a lavagem dela, com --rc trocado por cada cor de ramo.
   A cor do ramo entra no fundo (lavagem a 18%) e na borda, nunca no texto — mas a lavagem
   escurece o fundo do cartão no claro e clareia no imersão, e o rótulo e a data são a tinta
   mais fraca do leitor (--rdim). Devolve o pior caso de cada peça e em que cor ele acontece. */
async function varrerRamos(page, paleta) {
  await instalarTinta(page);
  return page.evaluate((paleta) => {
    const T = window.__ctTinta, rdr = document.querySelector('.rdr');
    const col = document.querySelector('[data-qd="quadro"] [data-qd-aberto="1"]');
    if (!rdr || !col) return null;
    const antes = rdr.style.getPropertyValue('--rc');
    const pecas = { cabecalho: '.qdCab b', data: '.qdCab small', marca: '.qdCab em', rotulo: '.qdCel .qdRot', valor: '.qdCel .qdVal' };
    const pior = {}, semLavagem = {};
    for (const k of Object.keys(pecas)) { pior[k] = { razao: Infinity, cor: '' }; semLavagem[k] = Infinity; }
    let seguiu = 0, lavagemVista = 0;
    for (const c of paleta) {
      rdr.style.setProperty('--rc', c);
      const cs = getComputedStyle(col);
      if (cs.getPropertyValue('--rc').trim().toUpperCase() === c) seguiu++;
      if (T.paradas(cs.backgroundImage).some(p => p[3] > 0.001)) lavagemVista++;
      for (const k of Object.keys(pecas)) {
        const el = col.querySelector(pecas[k]);
        const v = T.pior(el), s = T.pior(el, true);
        if (v !== null && v < pior[k].razao) pior[k] = { razao: v, cor: c };
        if (s !== null && s < semLavagem[k]) semLavagem[k] = s;
      }
    }
    rdr.style.setProperty('--rc', antes);
    return { pior, semLavagem, seguiu, lavagemVista, total: paleta.length };
  }, paleta);
}

/* (11) Transbordo, medido na CAIXA DO TEXTO. getBoundingClientRect de um bloco não cresce com
   a palavra que passa dele (o bloco tem a largura do pai; o texto sai por fora), então só a
   medida por Range enxerga "inconstitucionalidade" atravessando a borda. Os elementos também
   entram — é assim que se pega o trilho da grade crescendo até a palavra (o defeito do
   subgrid sem grid-template-columns). Limite de cada coisa: o texto de dentro de uma coluna
   não passa da borda DA COLUNA; o resto do bloco não passa da borda do bloco. */
async function medirTransbordo(page) {
  return page.evaluate((GIG) => {
    const q = document.querySelector('[data-qd="quadro"]');
    if (!q) return { achou: false };
    const bq = q.getBoundingClientRect(), rg = document.createRange();
    let pior = 0, quem = '';
    const anota = (fora, o) => { if (fora > pior) { pior = fora; quem = o; } };
    const medeTexto = (raiz, lim, nome) => {
      const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) {
        const t = w.currentNode; if (!t.nodeValue.trim()) continue;
        rg.selectNodeContents(t);
        for (const r of rg.getClientRects()) {
          if (!r.width) continue;
          anota(Math.max(r.right - lim.right, lim.left - r.left), nome + ' texto "' + t.nodeValue.trim().slice(0, 24) + '…" em ' + t.parentElement.className);
        }
      }
    };
    const medeElementos = (raiz, lim, nome) => {
      for (const el of raiz.querySelectorAll('*')) {
        const e = el.getBoundingClientRect(); if (!e.width) continue;
        anota(Math.max(e.right - lim.right, lim.left - e.left), nome + ' ' + el.tagName + '.' + String(el.className).split(' ')[0]);
      }
    };
    const cols = [...q.querySelectorAll('.qdCol')];
    for (const c of cols) { const b = c.getBoundingClientRect(); medeTexto(c, b, 'coluna ' + c.getAttribute('data-qd-col')); medeElementos(c, b, 'coluna ' + c.getAttribute('data-qd-col')); }
    const piorColuna = pior, quemColuna = quem;
    medeTexto(q, bq, 'bloco'); medeElementos(q, bq, 'bloco');
    const cab = q.querySelector('[data-qd-aberto="1"] .qdCab b'), val = q.querySelector('.qdCel[data-qd-lin="quandoIncide"] .qdVal');
    const g = getComputedStyle(q.querySelector('.qdGrade')), c0 = cols[0] ? getComputedStyle(cols[0]) : null;
    const doc = document.querySelector('.rdr .doc');
    return {
      achou: true, cols: cols.length,
      piorColuna: Math.round(piorColuna), quemColuna, pior: Math.round(pior), quem,
      // o caso não prova nada se a palavra gigante não estiver na tela
      gigNoCabecalho: !!cab && cab.textContent.indexOf(GIG.slice(0, 100)) >= 0,
      gigNaCelula: !!val && val.textContent.indexOf(GIG) >= 0,
      trilhos: g.gridTemplateColumns.split(' ').filter(Boolean).length,
      ladoALado: cols.length > 1 && new Set(cols.map(c => Math.round(c.getBoundingClientRect().top))).size === 1,
      displayDaColuna: c0 ? c0.display : '', linhasDaColuna: c0 ? c0.gridTemplateRows : '',
      rolaPagina: document.documentElement.scrollWidth - innerWidth,
      rolaDoc: doc ? doc.scrollWidth - doc.clientWidth : 0,
    };
  }, GIGANTE);
}

/* O motor sem subgrid: o que ele faz é ignorar o bloco @supports inteiro. Reproduz-se aqui
   forçando por cima exatamente o que aquele bloco liga — a coluna volta a ser bloco, sem
   linhas herdadas — e o resto da grade (trilhos, container query) segue igual. */
const SEM_SUBGRID = '.qdGrade{grid-template-rows:none!important}'
  + '.qdCol{display:block!important;grid-row:auto!important;grid-template-rows:none!important}'
  + '.qdCel{margin-bottom:9px!important;padding-bottom:0!important}';

/* Roda a medida de transbordo nos quadros que transbordariam (três e duas colunas), com e sem
   subgrid, na largura em que a página estiver. */
async function transbordoNaLargura(page, ok, R, largura, ids) {
  for (const [idx, n] of [[4, 3], [5, 2]]) {
    const abriu = await abrirVerbete(page, idx);
    const temQd = abriu && await esperar(page, () => !!document.querySelector('[data-qd="quadro"]'), null, 6000);
    ok(temQd, R + '(11) ' + largura + ': o quadro de ' + n + ' colunas com a palavra gigante pintou (' + ids[idx] + ')');
    if (!temQd) continue;
    for (const semSub of [false, true]) {
      const estilo = semSub ? await page.addStyleTag({ content: SEM_SUBGRID }) : null;
      const t = await medirTransbordo(page);
      if (estilo) await estilo.evaluate(el => el.remove());
      const modo = semSub ? 'SEM subgrid' : 'com subgrid';
      console.log('   [diagnóstico] ' + largura + ' ' + n + ' colunas ' + modo + ': ' + t.trilhos + ' trilho(s), '
        + (t.ladoALado ? 'lado a lado' : 'empilhadas') + ', coluna ' + t.displayDaColuna + ' · pior '
        + t.pior + 'px (' + (t.quem || '—') + ')');
      if (semSub) ok(t.displayDaColuna === 'block',
        R + '(11) ' + largura + ' ' + n + ' col.: a emulação do motor sem subgrid pegou (coluna ' + t.displayDaColuna + ')');
      ok(t.gigNoCabecalho && t.gigNaCelula,
        R + '(11) ' + largura + ' ' + n + ' col. ' + modo + ': a palavra de ' + GIGANTE.length
        + ' letras está no cabeçalho e na célula (senão o caso não prova nada)');
      ok(t.piorColuna <= 1,
        R + '(11) ' + largura + ' ' + n + ' col. ' + modo + ': nenhum texto passa da borda da COLUNA (pior '
        + t.piorColuna + 'px' + (t.piorColuna > 1 ? ': ' + t.quemColuna : '') + ')');
      ok(t.pior <= 1,
        R + '(11) ' + largura + ' ' + n + ' col. ' + modo + ': nem a trava, o rodapé ou "Do mesmo assunto" passam da borda do bloco (pior '
        + t.pior + 'px' + (t.pior > 1 ? ': ' + t.quem : '') + ')');
      ok(t.rolaPagina <= 0 && t.rolaDoc <= 0,
        R + '(11) ' + largura + ' ' + n + ' col. ' + modo + ': nada rola de lado (página ' + t.rolaPagina + ', documento ' + t.rolaDoc + ')');
    }
  }
}

/* O rodapé de honestidade não pode repetir "Confira:" — nem dobrado ("Confira: Confira: …",
   a IA já tinha escrito o prefixo), nem por letra ("Confira: C Confira: o …", o laço antigo).
   Cada "Confira:" abre um aviso de duas palavras ou mais. */
function lerConfiras(txt) {
  const partes = String(txt || '').split(/confira:/i).slice(1).map(s => s.trim());
  return {
    n: partes.length,
    dobrado: /confira:\s*confira/i.test(txt),
    curtos: partes.filter(s => s.split(/\s+/).filter(Boolean).length < 2),
  };
}
const palavras = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

/* ================================ o roteiro ================================ */
export async function testarJurisQuadro(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origem = opcoes.origem || (String(base).startsWith('file:') ? 'file' : 'http');
  const R = 'JURIS/QUADRO [' + motor + '] [' + origem + '] ';
  const browser = pageDaSuite.context().browser();

  // (8) não precisa de navegador: é contrato de texto, e o texto está no arquivo.
  contratoDoPrompt(ok, R);

  const ids = idsDoAcervo(8);
  const sem = semente(ids);
  const paleta = paletaDosRamos();

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try { await noDesktop(ctx, base, ok, R, ids, sem, paleta); } finally { await ctx.close(); }

  // Contexto próprio por largura, com isMobile + hasTouch: a régua de 44 px é do dedo.
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 },
    isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  try { await noCelular(mctx, base, ok, R, ids, sem); } finally { await mctx.close(); }

  // (9), (10) e (12): a validação e os estados de verdade, com o app de mentira do lado de fora.
  const ictx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try { await comIA(ictx, base, ok, R); } finally { await ictx.close(); }
}

/* ---------------- 1280 px: estrutura, filtro, trava, tinta, v1 ---------------- */
async function noDesktop(ctx, base, ok, R, ids, sem, paleta) {
  const { page, erros, pronto } = await abrirPagina(ctx, base, sem);
  ok(pronto, R + 'o acervo do JURIS carregou (openVerbete e os cartões existem)');
  if (!pronto) { await page.close(); return; }

  const mesmoAcervo = await page.evaluate((esperados) => {
    const idx = window.__JURIS_IDX__ || [];
    return esperados.every((id, i) => idx[i] && idx[i][0] === id);
  }, ids);
  ok(mesmoAcervo, R + 'os verbetes semeados são os que o acervo abre por índice (' + ids.slice(0, 3).join(', ') + '…)');

  const abriu = await abrirVerbete(page, 0);
  ok(abriu, R + 'o roteiro do verbete semeado pintou no leitor');
  if (!abriu) { await page.close(); return; }

  /* ---- (7) fora do sync: a chave não leva o prefixo que sobe para a nuvem ---- */
  const guardado = await page.evaluate((id) => {
    const chaves = Object.keys(localStorage);
    let q = null;
    try { q = (JSON.parse(localStorage.getItem('catedraJurisRoteiros')) || {})[id].q; } catch (_) {}
    return { chaves, temQuadro: !!(q && q.colunas && q.colunas.length === 3),
      naNuvem: chaves.filter(k => k.indexOf('catedra:') === 0
        && String(localStorage.getItem(k) || '').indexOf('combate a incêndio') >= 0) };
  }, ids[0]);
  ok(guardado.temQuadro, R + '(7) o quadro está gravado em catedraJurisRoteiros (3 colunas)');
  ok(guardado.chaves.indexOf('catedraJurisRoteiros') >= 0 && 'catedraJurisRoteiros'.indexOf('catedra:') !== 0,
    R + '(7) a chave do roteiro não leva o prefixo catedra: — o quadro fica no aparelho, fora do sync');
  ok(guardado.naNuvem.length === 0, R + '(7) nenhuma chave catedra:* carrega o quadro ('
    + (guardado.naNuvem.join(', ') || 'nenhuma') + ')');

  const e = await medirEstrutura(page);
  ok(e.achou, R + '(1) o bloco [data-qd="quadro"] existe no roteiro');
  if (!e.achou) { await page.close(); return; }
  console.log('   [diagnóstico] linhas pintadas: ' + e.linhasDom.join(', ')
    + ' · colunas ' + e.cols + ' · trilhos da grade ' + e.trilhos);

  /* ---- (1) pinta: uma coluna por tema, a primeira é a do verbete aberto ---- */
  ok(e.cols === 3, R + '(1) uma coluna por tema: três colunas semeadas, três pintadas (' + e.cols + ')');
  ok(e.ordem.join(',') === '0,1,2', R + '(1) as colunas se numeram na ordem (data-qd-col ' + e.ordem.join(',') + ')');
  ok(e.abertos.length === 1 && e.abertos[0] === '0' && e.classeAberta[0] === true
    && e.classeAberta.slice(1).every(x => x === false),
    R + '(1) só a PRIMEIRA coluna é a do verbete aberto (data-qd-aberto em ' + (e.abertos.join(',') || 'nenhuma') + ')');
  ok(/aberto/.test(e.palavraAberta[0]) && e.palavraAberta.slice(1).every(t => !t),
    R + '(1) a coluna aberta também DIZ que é ela, por escrito ("' + e.palavraAberta[0] + '") — cor nunca sozinha');
  ok(e.cabecalhos.every(t => t.length > 3) && e.datas.filter(Boolean).length === 3,
    R + '(1) cada coluna tem cabeçalho e data ("' + e.cabecalhos[0] + '" · ' + e.datas[0] + ')');
  ok(e.clicaveis.every(Boolean), R + '(1) coluna com id vira botão que abre o verbete ('
    + e.clicaveis.filter(Boolean).length + ' de 3)');
  ok(e.semListaAntiga, R + '(1) o quadro SUBSTITUI a lista "Relacionados" (nenhum .estJur no roteiro)');
  ok(e.mais.length === 1, R + '(1) o vizinho não confundível volta em "Do mesmo assunto" (' + e.mais.length + ')');

  /* a distinção da coluna aberta é medida, não presumida */
  ok(e.borda !== e.bordaOutra, R + '(1) a borda da coluna aberta é tingida e a das outras não ('
    + e.borda + ' × ' + e.bordaOutra + ')');
  ok(new Set(e.larguraDasBordas).size === 1, R + '(1) borda INTEIRA, não faixa lateral (larguras '
    + e.larguraDasBordas.join('/') + ')');
  ok(e.lavagem.indexOf('linear-gradient') === 0, R + '(1) a marca é lavagem de fundo (' + e.lavagem + '…)');
  ok(!/\brgba?\([^)]*\)\s+0px\s+0px\s+\d/.test(e.sombra), R + '(1) sem box-shadow de deslocamento zero ('
    + String(e.sombra).slice(0, 40) + ')');

  /* ---- (2) linha constante não entra ---- */
  const lin = e.porLinha;
  ok(!lin.fundamento, R + '(2) a linha constante NÃO entra: "Fundamento" vem igual nas três colunas e não pinta');
  ok(e.textoDoQuadro.indexOf('145') < 0,
    R + '(2) e o valor constante não sobrou em lugar nenhum do quadro');
  ok(!lin.situacaoHoje, R + '(2) linha com um valor só também não entra ("Situação hoje")');
  ok(!!lin.quandoIncide && lin.quandoIncide.valores.filter(Boolean).length === 3,
    R + '(2) a linha que DIFERE pinta nas três colunas ("Quando incide")');
  ok(!!lin.quemAlcanca, R + '(2) basta um par diferente para a linha entrar (§4.1: "Quem alcança" coincide em duas colunas e difere na terceira)');
  const rot = lin.quandoIncide ? lin.quandoIncide.rotulos.filter(Boolean) : [];
  ok(rot.length === 3 && rot.every(t => t === 'Quando incide'),
    R + '(2) o rótulo da linha é o canônico, repetido em cada coluna ("' + (rot[0] || '') + '")');
  ok(!!lin.excecoes && lin.excecoes.celulas === 3 && lin.excecoes.vaziasEscondidas === 1
    && lin.excecoes.valores.filter(Boolean).length === 2,
    R + '(2) célula ausente SOME e o lugar dela fica vazio e escondido do leitor de tela, para os rótulos continuarem alinhados');

  /* ---- (3) trava a divergência ---- */
  ok(e.trava.length === 2 && e.trava.every(t => t.length > 30),
    R + '(3) as frases "Não confunda" pintam (' + e.trava.length + ')');
  ok(e.trava.every(t => !/^(ambos|a diferença é sutil)/i.test(t)),
    R + '(3) nenhuma frase começa por "ambos" nem por "a diferença é sutil"');
  const eixoDoDom = e.linhasDom[0] ? lin[e.linhasDom[0]].valores.filter(Boolean) : [];
  const parRepetido = eixoDoDom.some((v, i) => eixoDoDom.slice(i + 1).some(w => norma(w) === norma(v)));
  ok(eixoDoDom.length === 3 && !parRepetido,
    R + '(3) na linha que carrega o eixo ("' + (e.linhasDom[0] || '?') + '") nenhum par de colunas repete o valor');
  const linhasSemDiferenca = e.linhasDom.filter(ch => {
    const v = lin[ch].valores.filter(Boolean).map(norma);
    return v.length < 2 || v.every(x => x === v[0]);
  });
  ok(linhasSemDiferenca.length === 0,
    R + '(3) toda linha pintada separa alguma coisa (' + e.linhasDom.length + ' linhas, '
    + linhasSemDiferenca.length + ' sem diferença)');
  const comParRepetido = e.linhasDom.filter(ch => {
    const v = lin[ch].valores.filter(Boolean).map(norma);
    return v.some((x, i) => v.slice(i + 1).some(y => y === x));
  });
  console.log('   [diagnóstico] linhas pintadas em que duas colunas ainda repetem o valor: '
    + (comParRepetido.join(', ') || 'nenhuma') + ' (o filtro do código é o do §4.1: basta UM par diferente)');

  /* ---- (4b) a 1280 px as colunas ficam lado a lado ---- */
  ok(new Set(e.topos).size === 1, R + '(4) a 1280 px as colunas ficam LADO A LADO (topos ' + e.topos.join(', ') + ')');
  ok(e.trilhos === 3, R + '(4) a grade abre em três trilhos a 1280 px (' + e.trilhos + ')');
  if (e.subgrid) {
    const alvo = e.linhasDom.find(ch => lin[ch].toposDoRotulo.filter(t => t !== null).length === 3) || e.linhasDom[0];
    const tops = lin[alvo].toposDoRotulo.filter(t => t !== null);
    ok(Math.max(...tops) - Math.min(...tops) <= 1,
      R + '(4) o subgrid alinha o rótulo da mesma linha nas três colunas ("' + alvo + '": ' + tops.join(', ') + ')');
  } else {
    console.log('   [diagnóstico] este motor não tem subgrid: os cartões só ficam lado a lado, como o contrato prevê');
  }
  ok(e.vazando.length === 0, R + '(4) a 1280 px nada do quadro passa da borda direita'
    + (e.vazando.length ? ' (' + e.vazando.join(' | ') + ')' : ''));

  /* ---- (13) o nome acessível da coluna aberta: a data e a marca por escrito ----
     Medido pelo nome que a árvore de acessibilidade calcula (aria snapshot), não pelo
     atributo: o que o leitor de tela anuncia é o nome COMPUTADO, e é nele que o aria-label
     substitui o conteúdo. */
  const nomes = [];
  for (let i = 0; i < 3; i++) {
    let snap = '';
    try { snap = await page.locator('[data-qd="quadro"] [data-qd-col="' + i + '"] .qdCab').ariaSnapshot({ timeout: 4000 }); } catch (_) {}
    const m = /^- (\w+) "((?:[^"\\]|\\.)*)"/m.exec(snap);
    nomes.push({ papel: m ? m[1] : '', nome: m ? m[2].replace(/\\"/g, '"') : '', snap });
  }
  const atual = await page.evaluate(() => [...document.querySelectorAll('[data-qd="quadro"] .qdCab')]
    .map(b => b.getAttribute('aria-current')));
  console.log('   [diagnóstico] nomes acessíveis: ' + nomes.map(n => n.papel + ' "' + n.nome + '"').join(' · '));
  const n0 = nomes[0].nome;
  ok(nomes[0].papel === 'button' && n0.indexOf(e.cabecalhos[0]) >= 0,
    R + '(13) o cabeçalho da coluna aberta é um botão cujo nome acessível traz o rótulo ("' + n0 + '")');
  ok(!!e.datas[0] && n0.indexOf(e.datas[0]) >= 0,
    R + '(13) o nome acessível da coluna aberta traz a DATA (' + e.datas[0] + ')');
  ok(/o verbete aberto/.test(n0),
    R + '(13) o nome acessível da coluna aberta traz a marca "o verbete aberto" — não é só a cor que a distingue');
  ok(atual[0] === 'true' && atual.slice(1).every(v => v === null),
    R + '(13) aria-current="true" só na coluna aberta (' + atual.map(v => v || '—').join(', ') + ')');
  ok(nomes.slice(1).every((n, k) => n.nome.indexOf(e.datas[k + 1]) >= 0 && !/verbete aberto/.test(n.nome) && /^Abrir /.test(n.nome)),
    R + '(13) as outras colunas se anunciam como "Abrir …" com a data, sem a marca da aberta');

  /* ---- (2b) o teto de 6 linhas corta pela ordem canônica ---- */
  const abriu1 = await abrirVerbete(page, 1);
  ok(abriu1, R + '(2b) o segundo verbete semeado abriu');
  if (abriu1) {
    const t = await medirEstrutura(page);
    ok(t.achou && t.linhasDom.length === 6,
      R + '(2b) teto de 6 linhas respeitado com nove eixos discriminantes semeados ('
      + (t.achou ? t.linhasDom.length : 'sem quadro') + ')');
    ok(t.achou && t.linhasDom.join(',') === ORDEM.slice(0, 6).join(','),
      R + '(2b) e o corte é pela ORDEM canônica, não pela ordem da IA (' + (t.achou ? t.linhasDom.join(', ') : '') + ')');
    ok(t.achou && t.tagsNoQuadro === 0 && t.textoDoQuadro.indexOf('<b>sem tag nenhuma</b>') >= 0,
      R + '(2b) o HTML que vier no texto sai escapado, como texto (nenhuma tag viva no quadro)');
  }

  /* ---- (6) retrocompatível: roteiro v1 pinta a lista e oferece o botão ---- */
  const abriu2 = await abrirVerbete(page, 2);
  ok(abriu2, R + '(6) o verbete com roteiro v1 (sem quadro) abriu');
  if (abriu2) {
    const v1 = await page.evaluate(() => {
      const ul = document.querySelector('#jrEstudo .estJur ul');
      const b = document.getElementById('estQuadro');
      const cs = ul ? getComputedStyle(ul) : null;
      const rgb = cs ? String(cs.backgroundColor).match(/[\d.]+/g) : null;
      const rb = b ? b.getBoundingClientRect() : null;
      return {
        temQuadro: !!document.querySelector('[data-qd="quadro"]'),
        itens: ul ? ul.querySelectorAll('li').length : 0,
        temCaixa: !!ul && ul.classList.contains('estCaixa'),
        // a caixa PINTA: fundo não transparente e borda de verdade — o seletor migrado
        // não ficou órfão (era ".estJur ul", e a classe nova poderia ter perdido a regra)
        fundoPinta: !!rgb && (rgb.length < 4 || +rgb[3] > 0),
        borda: cs ? Math.round(parseFloat(cs.borderTopWidth) * 100) / 100 : 0,
        recuo: cs ? Math.round(parseFloat(cs.paddingLeft)) : 0,
        temBotao: !!b, botaoAlto: rb ? Math.round(rb.height) : 0,
        rotulo: b ? b.textContent.trim() : '',
        svg: !!(b && b.querySelector('svg[aria-hidden="true"]')),
        emoji: b ? /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(b.textContent || '') : false,
      };
    });
    ok(!v1.temQuadro && v1.itens === 2,
      R + '(6) roteiro v1 continua pintando a lista antiga "Relacionados" (' + v1.itens + ' itens, sem quadro)');
    ok(v1.temCaixa && v1.fundoPinta && v1.borda >= 1 && v1.recuo >= 25,
      R + '(6) e a lista antiga PINTA com a caixa (fundo ' + (v1.fundoPinta ? 'sim' : 'não')
      + ', borda ' + v1.borda + 'px, recuo ' + v1.recuo + 'px) — nenhum seletor ficou órfão na migração');
    ok(v1.temBotao && v1.botaoAlto > 0 && /Montar o quadro comparativo/.test(v1.rotulo),
      R + '(6) o botão "Montar o quadro comparativo" é oferecido (' + v1.botaoAlto + 'px de altura)');
    ok(v1.svg && !v1.emoji, R + '(6) o ícone do botão é SVG aria-hidden, nunca emoji');
  }

  /* ---- (9b) o registro GRAVADO com listas em string ou em letras pinta limpo ---- */
  for (const [idx, como] of [[6, 'em string'], [7, 'em letras soltas']]) {
    const ab = await abrirVerbete(page, idx);
    const g = ab ? await medirEstrutura(page) : { achou: false };
    ok(g.achou, R + '(9) o quadro gravado com as listas ' + como + ' ainda pinta (' + ids[idx] + ')');
    if (!g.achou) continue;
    const cf = lerConfiras(g.rodape);
    console.log('   [diagnóstico] gravado ' + como + ': trava ' + JSON.stringify(g.trava) + ' · rodapé "' + g.rodape.slice(-90) + '"');
    ok(g.trava.length === 1 && g.trava[0] === TRAVA_EM_STRING,
      R + '(9) gravado ' + como + ': a trava pinta UMA frase, a inteira (' + g.trava.length + ' parágrafo(s))');
    ok(g.trava.every(p => palavras(p) > 3),
      R + '(9) gravado ' + como + ': todo parágrafo da trava tem mais de três palavras ('
      + g.trava.map(palavras).join(', ') + ')');
    ok(cf.n === 1 && !cf.dobrado && cf.curtos.length === 0,
      R + '(9) gravado ' + como + ': o rodapé diz "Confira:" uma vez só, sem prefixo dobrado nem aviso de uma letra ('
      + cf.n + ' ocorrência(s))');
    ok(g.rodape.indexOf('42') < 0, R + '(9) gravado ' + como + ': o item de uma palavra ("42") não vira aviso');
  }

  /* ---- (11) 1280 e 800: nada transborda, com e sem subgrid ---- */
  await transbordoNaLargura(page, ok, R, '1280', ids);
  await page.setViewportSize({ width: 800, height: 900 });
  await transbordoNaLargura(page, ok, R, '800', ids);
  await page.setViewportSize({ width: 1280, height: 900 });

  /* ---- (5) contraste calculado no claro, no imersão, e o corpo no modo leitura ---- */
  await abrirVerbete(page, 0);
  const claro = await medirTinta(page);
  console.log('   [diagnóstico] claro — ' + JSON.stringify(claro.contraste) + ' · rodapé ' + claro.rodape);
  paraCadaContraste(ok, R, 'claro', claro);
  ok(!claro.escuro, R + '(5) a medida do claro foi feita com o leitor claro');

  /* ---- (14) contraste SOBRE a lavagem da coluna aberta, em todas as cores de ramo ---- */
  const vClaro = await varrerRamos(page, paleta);
  paraCadaRamo(ok, R, 'claro', vClaro, paleta);

  await page.click('#jrDark');
  const viraEscuro = await esperar(page, () => !!document.querySelector('.rdr.dark'));
  ok(viraEscuro, R + '(5) o botão de imersão (#jrDark) escurece o leitor');
  const escuro = await medirTinta(page);
  console.log('   [diagnóstico] imersão — ' + JSON.stringify(escuro.contraste) + ' · rodapé do quadro '
    + escuro.rodape + ' · rodapé do roteiro inteiro ' + escuro.rodapeDoRoteiro
    + ' (mesma classe .estFonte e a mesma tinta do host: se os dois reprovam, a dívida é anterior ao quadro)');
  paraCadaContraste(ok, R, 'imersão', escuro);
  ok(claro.caixa !== escuro.caixa, R + '(5) o modo imersão troca o fundo da caixa do quadro ('
    + claro.caixa + ' → ' + escuro.caixa + ') — a regra escura alcança o quadro');
  const vEscuro = await varrerRamos(page, paleta);
  paraCadaRamo(ok, R, 'imersão', vEscuro, paleta);
  await page.click('#jrDark');

  await page.click('#jrLeitura');
  const viraLeitura = await esperar(page, () => !!document.querySelector('.rdr.leitura'));
  ok(viraLeitura, R + '(5) o botão de leitura (#jrLeitura) entra no modo leitura');
  const leitura = await medirTinta(page);
  ok(!!leitura.valor && !!claro.valor && leitura.valor.fs > claro.valor.fs,
    R + '(5) o modo leitura AUMENTA o corpo da célula (' + (claro.valor || {}).fs + 'px → '
    + (leitura.valor || {}).fs + 'px)');
  ok(!!leitura.valor && !!claro.valor && leitura.valor.familia !== claro.valor.familia,
    R + '(5) e serifa o valor (' + (claro.valor || {}).familia + ' → ' + (leitura.valor || {}).familia + ')');
  await page.click('#jrLeitura');

  /* a coluna clicável abre mesmo o verbete do vizinho — o quadro não é enfeite */
  const antes = await page.evaluate(() => document.getElementById('jrTitle').textContent);
  await page.evaluate(() => {
    const b = document.querySelectorAll('[data-qd="quadro"] button.qdCab')[1];
    if (b) b.click();
  });
  const trocou = await esperar(page, (t) => document.getElementById('jrTitle').textContent !== t, antes, 6000);
  ok(trocou, R + '(1) clicar no cabeçalho de uma coluna abre o verbete daquele vizinho');

  ok(erros.length === 0, R + 'nenhuma exceção na página (' + erros.slice(0, 1).join('').slice(0, 140) + ')');
  await page.close();
}

/* ---------------- 390 px: cabe, empilha e o dedo alcança ---------------- */
async function noCelular(ctx, base, ok, R, ids, sem) {
  const { page, erros, pronto } = await abrirPagina(ctx, base, sem);
  ok(pronto, R + '(4) 390: o acervo carregou no celular');
  if (!pronto) { await page.close(); return; }
  const abriu = await abrirVerbete(page, 0);
  ok(abriu, R + '(4) 390: o roteiro com o quadro pintou');
  if (!abriu) { await page.close(); return; }

  const e = await medirEstrutura(page);
  ok(e.achou, R + '(4) 390: o quadro existe');
  if (!e.achou) { await page.close(); return; }
  console.log('   [diagnóstico] 390 — direitas das colunas: ' + e.direitas.join(', ')
    + ' · janela ' + e.janela + ' · alvos ' + JSON.stringify(e.alvos));

  ok(new Set(e.topos).size === e.cols, R + '(4) 390: as colunas EMPILHAM (topos ' + e.topos.join(', ') + ')');
  ok(e.trilhos === 1, R + '(4) 390: a grade fica numa coluna só (' + e.trilhos + ' trilho)');
  ok(e.direitas.every(d => d <= e.janela + 1),
    R + '(4) 390: nenhuma coluna passa da borda direita (maior ' + Math.max(...e.direitas) + ' ≤ ' + (e.janela + 1) + ')');
  ok(e.vazando.length === 0, R + '(4) 390: nada dentro do quadro passa da borda direita'
    + (e.vazando.length ? ' (' + e.vazando.join(' | ') + ')' : ''));
  ok(e.rolaPagina <= 0, R + '(4) 390: a página não rola de lado (' + e.rolaPagina + ')');
  ok(e.rolaDoc <= 0, R + '(4) 390: o documento do leitor não rola de lado (' + e.rolaDoc + ')');
  // Alvo pequeno só é defeito quando não há área compensatória (o ::after de .ct-alvo).
  const curtos = e.alvos.filter(a => a.alt < 44 && !(a.area >= 44 && a.areaL >= 44));
  ok(e.alvos.length >= 3 && curtos.length === 0,
    R + '(4) 390: todo alvo do quadro dá 44 px ao dedo (' + e.alvos.length + ' botões'
    + (curtos.length ? '; curtos: ' + curtos.map(a => a.cls + ' ' + a.alt).join(', ') : '') + ')');

  const t = await medirTinta(page);
  console.log('   [diagnóstico] 390 claro — ' + JSON.stringify(t.contraste));
  paraCadaContraste(ok, R, '390', t);

  /* ---- (11) 390: a palavra gigante não passa da coluna, com e sem subgrid ---- */
  await transbordoNaLargura(page, ok, R, '390', ids);

  ok(erros.length === 0, R + '(4) 390: nenhuma exceção na página (' + erros.slice(0, 1).join('').slice(0, 140) + ')');
  await page.close();
}

/* ================= (9) (10) (12): a validação e os estados de verdade =================
   O satélite só pede IA ao app pai (iaPede recusa quando window.parent === window), então a
   página de fora faz o papel do app: guarda cada pedido ctIA e responde quando o CASO manda,
   com o texto que o caso fabricou. O prompt que chega é lido aqui — é nele que se vê quais
   candidatos o acervo ofereceu, que é onde a trava de duplicata age. */
const HOSPEDEIRO = (base) => '<!doctype html><html><head><meta charset="utf-8"></head>'
  + '<body style="margin:0"><iframe id="f" src="' + base + '/juris-web.html" style="width:1280px;height:900px;border:0"></iframe>'
  + '<script>window.PEDIDOS=[];'
  + 'addEventListener("message",function(e){var d=e.data;if(!d||d.type!=="ctIA")return;'
  + 'window.PEDIDOS.push({reqId:d.reqId,prompt:String(d.prompt||""),src:e.source});});'
  + 'window.responder=function(i,texto,erro){var p=window.PEDIDOS[i];'
  + 'p.src.postMessage({type:"ctIAResp",reqId:p.reqId,texto:texto||"",erro:erro||""},"*");};'
  + '</script></body></html>';

/* O que o prompt diz: o verbete aberto e cada candidato, com a coleção e o número — que, nas
   famílias de edição, o prompt tem de chamar de "edição" (chamá-lo de número convida a IA a
   citá-lo como se identificasse o julgado). */
function lerPrompt(p) {
  const cab = String(p || '').split('CANDIDATOS DO ACERVO')[0];
  const um = (re) => (re.exec(cab) || [])[1] || '';
  const aberto = { id: um(/VERBETE ABERTO\nid: (\S+)/), tribunal: um(/\nTRIBUNAL: ([^\n]*)/),
    colecao: um(/\nCOLEÇÃO: ([^\n]*)/), edicao: um(/\nEDIÇÃO: (\d+)/), numero: um(/\nNÚMERO: (\d+)/) };
  const cands = [];
  const re = /^\d+\) id: (\S+) \| tribunal: ([^|\n]*) \| coleção: ([^|\n]*?)(?: \| (edição|número): (\d+))? \| título: /gm;
  let m;
  while ((m = re.exec(String(p || '')))) cands.push({ id: m[1], tribunal: m[2].trim(), colecao: m[3].trim(), tipo: m[4] || '', num: m[5] || '' });
  return { aberto, cands };
}

/* A resposta "boa" da IA, com os vizinhos que o caso escolher e as listas que ele mandar. */
function respostaQuadro(abertoId, vizinhos, extra) {
  const cel = (s) => ({ quandoIncide: 'o gatilho ' + s + ' aparece no enunciado da questão',
    teseFixada: 'a tese ' + s + ' fixada pelo tribunal', efeitoPratico: 'o efeito ' + s + ' que o juiz escreve' });
  return JSON.stringify(Object.assign({ objeto: 'o objeto comum aos verbetes', eixo: 'a variável que separa',
    colunas: [{ id: abertoId, celulas: cel('A') }].concat(vizinhos.map((id, i) => ({ id, celulas: cel('BCD'[i]) }))) }, extra || {}));
}

async function comIA(ctx, base, ok, R) {
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(String((e && e.message) || e)));

  // Os verbetes de cada caso. Escolhidos no ACERVO, com a razão da escolha ao lado — e cada um
  // tem alternativa, porque os informativos são regerados toda semana e um id pode sumir.
  //  · famílias de Jurisprudência em Teses: a edição tem teses irmãs que dividem o assunto da
  //    edição, então elas SÃO os vizinhos mais parecidos (e a trava antiga por tribunal+número
  //    apagava todas, porque o número delas é a edição do aberto);
  //  · família de informativo do STF: julgados diferentes da MESMA edição (Info 1000), com o
  //    título genérico "Info 1000 · STF" — a trava por tribunal+número juntava todos numa só;
  //  · acervo sem vizinho: súmulas cujo assunto dá dois termos que ninguém mais do ramo tem
  //    ("Habeas Data"); o enunciado não entra na busca quando o assunto já dá dois termos, então
  //    o desfecho não depende do texto carregado.
  const TEMAS_EM_TESES = ['JT-ED003-02', 'JT-ED002-05', 'JT-ED007-06', 'JT-ED006-07'];
  const INFORMATIVO_STF = ['INF2020-0023', 'INF2020-0086', 'INF2020-0122'];
  const SEM_VIZINHO = ['STJ-SUM-2', 'STJ-SUM-100', 'STJ-SUM-50', 'STJ-SUM-117'];
  const repub = republicacoes(3);
  const existe = new Set(acervoInteiro().map(x => x[0]));
  const primeiro = (lista) => lista.filter(id => existe.has(id));
  const tt = primeiro(TEMAS_EM_TESES);
  const familia = tt[0] || '', familia2 = tt[1] || '';
  const infoStf = primeiro(INFORMATIVO_STF)[0] || '';
  const par = duplicataReal();
  const semVizinho = primeiro(SEM_VIZINHO);
  const repubs = repub.filter(p => existe.has(p.a) && existe.has(p.b));

  // Um roteiro v1 (sem quadro) para cada um: é o que faz o botão "Montar o quadro" aparecer.
  // A frase carrega o id — é por ela que se sabe que o roteiro na tela é o do verbete certo.
  const alvos = [familia, familia2, infoStf, par && par.original, ...semVizinho, ...repubs.map(p => p.a)].filter(Boolean);
  const sem = {};
  for (const id of alvos) sem[id] = { ts: 1, frase: 'SEMENTE ' + id, chave: ['um ponto', 'outro ponto'], jurisprudencia: ['STF · Tema 1'] };
  await page.goto(base + '/__semente');
  await page.evaluate((s) => { try { localStorage.clear(); localStorage.setItem('catedraJurisRoteiros', JSON.stringify(s)); } catch (_) {} }, sem);
  await page.setContent(HOSPEDEIRO(base));
  const fr = await (await page.waitForSelector('#f')).contentFrame();
  const errosFr = [];
  page.on('console', m => { if (m.type() === 'error' && /juris-web/.test((m.location() || {}).url || '')) errosFr.push(m.text()); });
  const pronto = fr && await esperar(fr, () => typeof window.openVerbete === 'function'
    && !!window.__JURIS_IDX__ && document.querySelectorAll('.vcard').length > 0, null, 25000);
  ok(!!pronto, R + '(9) o satélite abriu dentro do app de mentira que responde a ponte ctIA');
  if (!pronto) { await page.close(); return; }
  // o pageerror da página nem sempre traz a exceção de dentro do iframe: o satélite também
  // guarda as dele, e as duas listas se somam no fim
  await fr.evaluate(() => { window.__ctErros = [];
    addEventListener('error', (e) => window.__ctErros.push(String(e.message)));
    addEventListener('unhandledrejection', (e) => window.__ctErros.push('promessa recusada: ' + String((e.reason && e.reason.message) || e.reason))); });

  const abrir = async (id) => {
    const i = await fr.evaluate((k) => (window.__JURIS_IDX__ || []).findIndex(x => x[0] === k), id);
    if (i < 0) return false;
    await fr.evaluate((k) => window.openVerbete(k), i);
    return esperar(fr, (k) => { const p = document.querySelector('#jrEstudo .estFrase p');
      return !!p && p.textContent === 'SEMENTE ' + k; }, id, 12000);
  };
  const pedidos = () => page.evaluate(() => window.PEDIDOS.length);
  // clica o botão do quadro e espera o pedido chegar ao app (qdTrechos pode levar até 6 s)
  const pedirQuadro = async () => {
    const n = await pedidos();
    await fr.evaluate(() => { const b = document.getElementById('estQuadro'); if (b) b.click(); });
    const veio = await esperar(page, (k) => window.PEDIDOS.length > k, n, 12000);
    return veio ? { i: n, prompt: await page.evaluate((k) => window.PEDIDOS[k].prompt, n) } : null;
  };
  const responder = (i, texto, erro) => page.evaluate(([k, t, e]) => window.responder(k, t, e), [i, texto || '', erro || '']);
  const esperarQuadro = () => esperar(fr, () => !!document.querySelector('#estQdSlot [data-qd="quadro"]'), null, 10000);
  const esperarEstado = (lista) => esperar(fr, (l) => { const e = document.querySelector('#estQdSlot [data-qd-estado]');
    return !!e && l.indexOf(e.getAttribute('data-qd-estado')) >= 0; }, lista, 10000);
  const gravado = (id) => fr.evaluate((k) => { try { return ((JSON.parse(localStorage.getItem('catedraJurisRoteiros')) || {})[k] || {}).q || null; } catch (_) { return null; } }, id);
  // o que a pessoa VÊ do desfecho: o estado, a fala (aviso da oferta ou rodapé do bloco), o botão
  const desfecho = () => fr.evaluate(() => {
    const slot = document.getElementById('estQdSlot');
    const e = slot && slot.querySelector('[data-qd-estado]');
    const b = document.getElementById('estQuadro');
    const visivel = (el) => { if (!el) return false; const r = el.getBoundingClientRect(), c = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && +c.opacity > 0; };
    const fala = e ? (e.querySelector('#estQdAviso') || e.querySelector('.estFonte')) : null;
    return { estado: e ? e.getAttribute('data-qd-estado') : '', fala: fala ? fala.innerText.trim() : '', falaVisivel: visivel(fala),
      botao: b ? { texto: b.textContent.trim(), habilitado: !b.disabled, visivel: visivel(b), svg: !!b.querySelector('svg[aria-hidden="true"]') } : null,
      textoDoSlot: slot ? slot.innerText : '',
      mais: e ? [...e.querySelectorAll('.qdMais [data-qd-id]')].map(x => x.getAttribute('data-qd-id')) : [] };
  });

  /* ---------- (10) família de Jurisprudência em Teses + (9) listas em STRING ---------- */
  ok(!!familia, R + '(10) há uma tese de Jurisprudência em Teses para o caso da família (' + (familia || 'nenhuma de ' + TEMAS_EM_TESES.join(', ')) + ')');
  if (familia && await abrir(familia)) {
    const p = await pedirQuadro();
    ok(!!p, R + '(10) o botão pediu o quadro à IA (' + familia + ')');
    if (p) {
      const { aberto, cands } = lerPrompt(p.prompt);
      const irmas = cands.filter(c => c.colecao === aberto.colecao && c.tribunal === aberto.tribunal && c.num && c.num === aberto.edicao);
      console.log('   [diagnóstico] candidatos de ' + familia + ' (Ed. ' + aberto.edicao + '): ' + cands.map(c => c.id).join(', '));
      ok(!!aberto.edicao && !aberto.numero,
        R + '(10) no prompt o número da tese aberta é chamado de EDIÇÃO (' + (aberto.edicao ? 'Ed. ' + aberto.edicao : 'sem edição') + ')');
      ok(irmas.length >= 2 && irmas.every(c => c.tipo === 'edição'),
        R + '(10) as teses irmãs da MESMA edição ficam entre os candidatos — a família não é duplicata ('
        + irmas.length + ': ' + irmas.map(c => c.id).join(', ') + ')');
      const viz = irmas.slice(0, 2).map(c => c.id);
      await responder(p.i, respostaQuadro(familia, viz, {
        naoConfunda: TRAVA_EM_STRING,
        semCerteza: 'Confira: a data de publicação da edição no site do tribunal.' }));
      const veio = await esperarQuadro();
      ok(veio, R + '(9) a resposta com "naoConfunda" e "semCerteza" em STRING passou pela validação e virou quadro');
      if (veio) {
        const q = await medirEstrutura(fr);
        const cf = lerConfiras(q.rodape);
        console.log('   [diagnóstico] quadro da família: ' + q.cabecalhos.join(' | ') + ' · trava ' + JSON.stringify(q.trava));
        ok(q.cols === 3 && viz.every(id => q.idsDasColunas.indexOf(id) >= 0),
          R + '(10) e a validação também não as descarta: três colunas, as duas irmãs escolhidas entre elas (' + q.cols + ')');
        ok(new Set(q.cabecalhos).size === q.cabecalhos.length,
          R + '(10) os cabeçalhos das teses irmãs não se repetem (' + q.cabecalhos.join(' · ') + ')');
        ok(q.trava.length === 1 && q.trava[0] === TRAVA_EM_STRING,
          R + '(9) "naoConfunda" em string vira UMA frase, a inteira — nunca uma letra por parágrafo (' + q.trava.length + ' parágrafo(s))');
        ok(q.trava.length > 0 && q.trava.every(t => palavras(t) > 3),
          R + '(9) todo parágrafo da trava tem mais de três palavras (' + q.trava.map(palavras).join(', ') + ')');
        ok(cf.n >= 1 && !cf.dobrado && cf.curtos.length === 0 && (q.rodape.match(/data de publicação da edição/g) || []).length === 1,
          R + '(9) "semCerteza" em string: o rodapé diz o aviso uma vez, sem repetir "Confira:" (' + cf.n + ' "Confira:", '
          + cf.curtos.length + ' aviso(s) curto(s))');
        const g = await gravado(familia);
        ok(!!g && Array.isArray(g.naoConfunda) && g.naoConfunda.length === 1 && g.naoConfunda[0] === TRAVA_EM_STRING
          && Array.isArray(g.semCerteza) && g.semCerteza.every(s => /^confira: /i.test(s) && !/^confira:\s*confira/i.test(s)),
          R + '(9) e o que ficou GRAVADO já é lista limpa: 1 frase na trava, cada aviso com um "Confira:" só ('
          + (g ? JSON.stringify(g.semCerteza).slice(0, 120) : 'nada gravado') + ')');
      }
    }
  }

  /* ---------- (9) listas em LETRAS SOLTAS e lixo, pela validação ---------- */
  if (familia2 && await abrir(familia2)) {
    const p = await pedirQuadro();
    const { cands } = lerPrompt(p ? p.prompt : '');
    ok(!!p && cands.length >= 2, R + '(9) o segundo verbete (' + familia2 + ') tem vizinhos para a resposta com lixo (' + cands.length + ')');
    if (p && cands.length >= 2) {
      await responder(p.i, respostaQuadro(familia2, cands.slice(0, 2).map(c => c.id), {
        naoConfunda: ['S', 'e', ' ', 'ambos', 'a diferença é', 42, null, TRAVA_EM_STRING],
        semCerteza: ['C', 'o', 'Confira: a data da edição', 'confira: o número do recurso', '42', { x: 1 }] }));
      const veio = await esperarQuadro();
      ok(veio, R + '(9) a resposta com letras soltas nas listas virou quadro (o lixo não derrubou a validação)');
      if (veio) {
        const q = await medirEstrutura(fr);
        const cf = lerConfiras(q.rodape);
        console.log('   [diagnóstico] letras soltas → trava ' + JSON.stringify(q.trava) + ' · rodapé "' + q.rodape.slice(-140) + '"');
        ok(q.trava.length === 1 && q.trava.every(t => palavras(t) > 3),
          R + '(9) nenhuma letra solta, "ambos" ou número vira parágrafo da trava (' + q.trava.length + ' parágrafo(s): '
          + q.trava.map(palavras).join(', ') + ' palavras)');
        ok(cf.n >= 2 && !cf.dobrado && cf.curtos.length === 0 && q.rodape.indexOf('42') < 0,
          R + '(9) o rodapé não repete "Confira:" nem aviso de uma letra ou de um número (' + cf.n + ' avisos'
          + (cf.curtos.length ? ', curtos: ' + JSON.stringify(cf.curtos) : '') + ')');
      }
    }
  }

  /* ---------- (10) família de informativo: o número é a edição, e ela não colapsa ---------- */
  if (infoStf && await abrir(infoStf)) {
    const p = await pedirQuadro();
    if (p) {
      const { aberto, cands } = lerPrompt(p.prompt);
      const irmas = cands.filter(c => c.colecao === aberto.colecao && c.num && c.num === aberto.edicao);
      ok(!!aberto.edicao && irmas.length >= 2,
        R + '(10) julgados da MESMA edição de informativo continuam candidatos uns dos outros ('
        + infoStf + ', Info ' + (aberto.edicao || '?') + ': ' + irmas.length + ' irmãos)');
      await responder(p.i, '', 'fim do caso');
    } else ok(false, R + '(10) o botão pediu o quadro do informativo à IA (' + infoStf + ')');
  }

  /* ---------- (10) a duplicata REAL fica fora + (12) estados (c) e (b) ---------- */
  const vistos = {};
  ok(!!par, R + '(10) o acervo tem o par de duplicata real para o caso (' + (par ? par.original + ' = ' + par.copia : 'nenhum') + ')');
  if (par && await abrir(par.original)) {
    const p = await pedirQuadro();
    const { cands } = lerPrompt(p ? p.prompt : '');
    ok(!!p && cands.length >= 1,
      R + '(10) ' + par.original + ' tem candidatos — a busca rodou (' + cands.length + ')');
    ok(!!p && cands.every(c => c.id !== par.copia),
      R + '(10) a duplicata REAL (' + par.copia + ', o mesmo tema em outro registro) NÃO é candidata do original');
    if (p) {
      // (c) a IA falhou
      await responder(p.i, '', 'a conexão caiu');
      ok(await esperarEstado(['falhou']), R + '(12) a falha da IA chega à tela como estado próprio ("falhou")');
      vistos.falhou = await desfecho();
      // "Tentar de novo" pede de novo — e agora a IA diz que nada é confundível: (b)
      const p2 = await pedirQuadro();
      ok(!!p2, R + '(12) "Tentar de novo" pede o quadro outra vez');
      if (p2) {
        ok(lerPrompt(p2.prompt).cands.every(c => c.id !== par.copia),
          R + '(10) no segundo pedido a duplicata real continua fora');
        await responder(p2.i, JSON.stringify({ colunas: [] }));
        ok(await esperarEstado(['recusado']), R + '(12) a recusa da IA chega à tela como estado próprio ("recusado")');
        vistos.recusado = await desfecho();
        ok(vistos.recusado.mais.length >= 1 && vistos.recusado.mais.indexOf(par.copia) < 0,
          R + '(10) e "Do mesmo assunto" mostra os vizinhos reais sem a duplicata (' + vistos.recusado.mais.length + ' itens)');
      }
    }
  }

  /* ---------- (10) o mesmo julgado REPUBLICADO em dois registros de informativo ----------
     As coletâneas de 2020 e 2021 trazem os mesmos julgados com ids diferentes. O título é
     genérico ("Info 684 · STJ"), e a chave de texto de propósito não o usa — mas tribunal,
     edição, assunto, data e ENUNCIADO são os mesmos: é duplicata real, e se a IA escolher o
     gêmeo o quadro compara o julgado com ele mesmo. */
  if (!repubs.length) console.log('   [diagnóstico] nenhum par de republicação achado no acervo: o caso não se aplica');
  const vazam = [], medidos = [];
  for (const rp of repubs) {
    if (!(await abrir(rp.a))) { console.log('   [diagnóstico] o verbete republicado ' + rp.a + ' não abriu'); continue; }
    const p = await pedirQuadro();
    if (!p) { console.log('   [diagnóstico] ' + rp.a + ' não pediu o quadro à IA'); continue; }
    medidos.push(rp.a);
    if (lerPrompt(p.prompt).cands.some(c => c.id === rp.b)) vazam.push(rp.a + ' = ' + rp.b);
    await responder(p.i, '', 'fim do caso');
  }
  if (repubs.length) {
    ok(medidos.length === repubs.length,
      R + '(10) os verbetes republicados abriram e pediram o quadro (' + medidos.length + ' de ' + repubs.length + ')');
    ok(vazam.length === 0,
      R + '(10) o mesmo julgado REPUBLICADO em dois registros (mesmo tribunal, edição, assunto, data e enunciado) não é candidato de si mesmo ('
      + (vazam.length ? vazam.length + ' de ' + medidos.length + ' pares vazam: ' + vazam.join('; ') : medidos.length + ' pares, nenhum vaza') + ')');
  }

  /* ---------- (12) estado (a): o acervo não tem vizinho ---------- */
  let semViz = '';
  for (const id of semVizinho) {
    if (!(await abrir(id))) continue;
    const n = await pedidos();
    await fr.evaluate(() => { const b = document.getElementById('estQuadro'); if (b) b.click(); });
    // o desfecho (a) é SÍNCRONO (qdGerar volta antes de qualquer IA); "montando" = achou vizinho
    await esperarEstado(['sem-vizinho', 'sem-assunto', 'montando']);
    const d = await desfecho();
    if (d.estado === 'sem-vizinho' || d.estado === 'sem-assunto') {
      ok(await pedidos() === n, R + '(12) sem vizinho no acervo (' + id + '): nenhuma chamada de IA foi feita');
      vistos.semVizinho = d; semViz = id; break;
    }
    console.log('   [diagnóstico] ' + id + ' ganhou vizinho no acervo (' + d.estado + '); tentando o próximo');
    if (await esperar(page, (k) => window.PEDIDOS.length > k, n, 12000)) await responder(n, '', 'fim do caso');
  }
  ok(!!semViz, R + '(12) há um verbete sem vizinho no acervo para o estado (a) (' + (semViz || 'nenhum de ' + SEM_VIZINHO.join(', ')) + ')');
  if (semViz && familia) {
    // sair e voltar: o desfecho do acervo não é esquecido nem vira convite para gastar IA
    const n = await pedidos();
    await abrir(familia); await abrir(semViz);
    const d = await desfecho();
    ok(d.estado === vistos.semVizinho.estado && !d.botao && await pedidos() === n,
      R + '(12) sair e voltar mantém o desfecho (a), sem botão e sem nova chamada de IA (' + d.estado + ')');
  }

  /* ---------- (12) os três desfechos dizem coisas diferentes, e só a falha oferece de novo ---------- */
  const [a, b, c] = [vistos.semVizinho, vistos.recusado, vistos.falhou];
  if (a && b && c) {
    console.log('   [diagnóstico] (a) ' + a.estado + ': "' + a.fala + '"');
    console.log('   [diagnóstico] (b) ' + b.estado + ': "' + b.fala + '"');
    console.log('   [diagnóstico] (c) ' + c.estado + ': "' + c.fala + '" · botão ' + JSON.stringify(c.botao));
    ok(new Set([a.estado, b.estado, c.estado]).size === 3,
      R + '(12) três desfechos, três estados distintos (' + [a.estado, b.estado, c.estado].join(' · ') + ')');
    ok(a.falaVisivel && b.falaVisivel && c.falaVisivel && a.fala && b.fala && c.fala
      && new Set([norma(a.fala), norma(b.fala), norma(c.fala)]).size === 3,
      R + '(12) e cada um DIZ na tela uma coisa diferente (três falas visíveis e distintas)');
    ok(/acervo/i.test(a.fala) && !/\bIA\b/.test(a.fala),
      R + '(12) (a) fala do ACERVO e não culpa a IA, que nem foi chamada');
    ok(/\bIA\b/.test(b.fala) && /\bIA\b/.test(c.fala) && !/acervo/i.test(c.fala),
      R + '(12) (b) atribui o juízo à IA, e (c) diz que a IA falhou sem transformar a falha em fato do acervo');
    const oferece = (d) => (!!d.botao && d.botao.visivel && d.botao.habilitado && /tentar de novo/i.test(d.botao.texto))
      || /tent(e|ar) de novo/i.test(d.textoDoSlot);
    ok(oferece(c) && !!c.botao && c.botao.habilitado && c.botao.svg && /tente de novo/i.test(c.fala),
      R + '(12) só a falha da IA oferece "tente de novo" — com botão habilitado e ícone SVG ("' + (c.botao ? c.botao.texto : '—') + '")');
    ok(!oferece(a) && !oferece(b) && !a.botao && !b.botao,
      R + '(12) nem o acervo sem vizinho nem a recusa da IA oferecem tentar de novo (repetir daria o mesmo resultado)');
  } else {
    ok(false, R + '(12) os três desfechos foram alcançados para a comparação ('
      + ['semVizinho', 'recusado', 'falhou'].filter(k => !vistos[k]).join(', ') + ' faltando)');
  }

  const todas = erros.concat(await fr.evaluate(() => window.__ctErros || []).catch(() => []));
  ok(todas.length === 0, R + '(9) nenhuma exceção no satélite com a IA de mentira (' + todas.slice(0, 1).join('').slice(0, 140) + ')');
  if (errosFr.length) console.log('   [diagnóstico] erros de console do satélite: ' + errosFr.slice(0, 3).join(' | '));
  await page.close();
}

/* Cada pedaço de texto do quadro vira um caso próprio: "o quadro é legível" não diz qual
   parte apagou quando falha. */
function paraCadaContraste(ok, R, modo, m) {
  const nomes = { rotulo: 'rótulo da linha', valor: 'valor da célula', cabecalho: 'cabeçalho da coluna',
    data: 'data da coluna', contexto: 'linha de contexto', trava: 'frase "Não confunda"' };
  for (const k of Object.keys(nomes)) {
    const v = m.contraste[k];
    ok(v !== null && v >= 4.5, R + '(5) ' + modo + ': ' + nomes[k] + ' com contraste calculado ≥ 4,5:1 ('
      + (v === null ? 'elemento ausente' : v + ':1') + ')');
  }
  ok(m.rodape !== null && m.rodape >= 4.5, R + '(5) ' + modo + ': rodapé de honestidade com contraste ≥ 4,5:1 ('
    + (m.rodape === null ? 'ausente' : m.rodape + ':1') + ')');
}

/* (14) Um caso por peça da coluna aberta, com o pior ramo nomeado. E dois casos que dizem se a
   medida vale: a troca de --rc chegou à coluna, e a lavagem foi de fato lida como gradiente. */
function paraCadaRamo(ok, R, modo, v, paleta) {
  ok(paleta.length >= 10, R + '(14) ' + modo + ': a paleta dos ramos foi lida do juris-web.html (' + paleta.length + ' cores)');
  if (!v) { ok(false, R + '(14) ' + modo + ': a coluna aberta existe para a varredura'); return; }
  ok(v.seguiu === v.total, R + '(14) ' + modo + ': a cor de cada ramo chegou à coluna aberta (' + v.seguiu + ' de ' + v.total + ')');
  ok(v.lavagemVista === v.total,
    R + '(14) ' + modo + ': a medida enxergou a lavagem em gradiente da coluna aberta (' + v.lavagemVista + ' de ' + v.total + ' ramos)');
  const nomes = { cabecalho: 'cabeçalho', data: 'data', marca: '"o verbete aberto"', rotulo: 'rótulo da linha', valor: 'valor da célula' };
  console.log('   [diagnóstico] (14) ' + modo + ' — pior sobre a lavagem: '
    + Object.keys(nomes).map(k => k + ' ' + v.pior[k].razao + ' (' + v.pior[k].cor + ')').join(' · ')
    + ' | sem a lavagem seria: ' + Object.keys(nomes).map(k => k + ' ' + v.semLavagem[k]).join(' · '));
  for (const k of Object.keys(nomes)) {
    const p = v.pior[k];
    ok(isFinite(p.razao) && p.razao >= 4.5,
      R + '(14) ' + modo + ': ' + nomes[k] + ' da coluna ABERTA ≥ 4,5:1 sobre a lavagem, no pior de '
      + v.total + ' ramos (' + (isFinite(p.razao) ? p.razao + ':1 em ' + p.cor : 'ausente') + ')');
  }
}

/* Normalização igual à do código que filtra a linha constante (minúsculas, sem acento, sem
   pontuação, espaços colapsados): comparar valores de outro jeito daria falso vermelho. */
function norma(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/* (8) O contrato do prompt. `promptQuadro` vive dentro do IIFE do satélite e não é
   exportada — então o caso lê o arquivo, como a suíte já faz com outros contratos de texto.
   O que se exige é o que impede a IA de inventar: nenhum número fora do material, o id
   copiado da lista, as chaves na ordem canônica e o molde do "Não confunda". */
function contratoDoPrompt(ok, R) {
  let fonte = '';
  try { fonte = fs.readFileSync(path.join(RAIZ, 'juris-web.html'), 'utf8'); } catch (_) {}
  const corte = fonte.indexOf('function promptQuadro');
  const fim = corte < 0 ? -1 : fonte.indexOf('\n  function ', corte + 10);
  const p = corte < 0 ? '' : fonte.slice(corte, fim < 0 ? corte + 8000 : fim);
  ok(p.length > 500, R + '(8) promptQuadro existe em juris-web.html (' + p.length + ' caracteres)');
  if (!p) return;
  ok(/NÃO invente número de tema, súmula, recurso, informativo ou artigo/.test(p)
    && /número que esteja ESCRITO no material/.test(p),
    R + '(8) a regra de NÃO inventar número sobreviveu no prompt');
  ok(/id["'\s]*exato/i.test(p) && /copiado da lista/.test(p),
    R + '(8) o prompt exige o id exato, copiado da lista de candidatos');
  ok(/SOMENTE um objeto JSON/.test(p), R + '(8) o prompt exige SOMENTE o objeto JSON do contrato');
  ok(/NÃO EXISTE: omita/.test(p) && /não informado/.test(p),
    R + '(8) o prompt manda omitir a chave que não souber, em vez de preencher com "—" ou "não informado"');
  ok(/O que decide é/.test(p) && /ambos/.test(p),
    R + '(8) o molde do "Não confunda" e a proibição de começar por "ambos" continuam no prompt');
  ok(/NO MÁXIMO 2 candidatos/.test(p), R + '(8) o prompt limita a escolha a 2 vizinhos confundíveis');
  const pos = ORDEM.slice(0, 8).map(k => p.indexOf('"' + k + '"'));
  ok(pos.every(i => i > 0) && pos.every((v, i) => i === 0 || v > pos[i - 1]),
    R + '(8) as oito chaves de célula estão no prompt, na ordem canônica da seção 3');
  ok(/iaPede\(promptQuadro\(/.test(fonte),
    R + '(8) e é esse prompt que a chamada do quadro usa (nada de contrato em texto morto)');
}

// execução avulsa: `CT_PORT=8145 node tests/juris-quadro.mjs`
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { iniciarServidor, lancarNavegador } = await import('./_infra.mjs');
  const { srv, url } = await iniciarServidor(RAIZ, +(process.env.CT_PORT || 8145));
  const { browser, motor } = await lancarNavegador();
  const page = await browser.newPage();
  const falhas = [];
  const ok = (c, l) => { console.log((c ? '✓ ' : '✗ ') + l); if (!c) falhas.push(l); };
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  try { await testarJurisQuadro(page, url, ok, { motor, origem: 'http' }); }
  catch (e) { ok(false, 'JURIS/QUADRO o roteiro correu sem exceção ('
    + String((e && e.message) || e).split('\n')[0].slice(0, 160) + ')'); }
  await browser.close(); srv.close();
  console.log(falhas.length ? ('\nFALHAS: ' + falhas.length) : '\nTODOS OS TESTES PASSARAM');
  process.exit(falhas.length ? 1 : 0);
}
