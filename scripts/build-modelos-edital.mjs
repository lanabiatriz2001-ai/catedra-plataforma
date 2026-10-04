#!/usr/bin/env node
/* Modelos de edital a partir do TEXTO OFICIAL.

   Cada modelo novo nasce de um arquivo em scripts/fontes/editais/<id>.txt — o conteúdo
   programático copiado do PDF da banca, sem reescrever — descrito em
   scripts/fontes/editais/indice.json (órgão, cargo, banca, data, endereço do PDF, páginas).
   Este script passa cada texto pelo MESMO importador da tela (o parseEdital do
   Catedra.dc.html, lido do arquivo — não uma cópia) e grava:
     · o conteúdo em modelos-edital.js (window.CT_MODELOS_DATA);
     · o cartão (nome, contagens) em CT_MODELOS e a lista de cada área em CT_AREAS,
       dentro do Catedra.dc.html.
   Os modelos antigos, que não têm fonte aqui, ficam exatamente como estão.

   node scripts/build-modelos-edital.mjs            grava
   node scripts/build-modelos-edital.mjs --conferir não grava; sai com 1 se algo mudaria
   node scripts/build-modelos-edital.mjs --resumo   só lista o que cada fonte rende */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONTES = path.join(RAIZ, 'scripts', 'fontes', 'editais');
const APP = path.join(RAIZ, 'Catedra.dc.html');
const DADOS = path.join(RAIZ, 'modelos-edital.js');
const modo = process.argv.includes('--conferir') ? 'conferir' : process.argv.includes('--resumo') ? 'resumo' : 'gravar';

/* O importador da tela, tirado do próprio app: do titleCase até o fim do parseEdital, mais a
   paleta. Se esses marcos mudarem de lugar, o script para aqui em vez de usar um parser velho. */
export function importadorDoApp(html) {
  const linhas = html.split('\n');
  const a = linhas.findIndex(l => l.startsWith('  titleCase(s){'));
  const b = linhas.findIndex(l => l.includes('edSetRaw = (e)=>'));
  const c = linhas.findIndex(l => l.startsWith('  _editalColor(disc, idx){'));
  if (a < 0 || b < a || c < 0) throw new Error('não achei o importador (titleCase … parseEdital, _editalColor) no Catedra.dc.html');
  let corpo = linhas.slice(a, b + 1).join('\n');
  corpo = corpo.slice(0, corpo.lastIndexOf('edSetRaw'));
  let cor = ''; for (let i = c; i < linhas.length; i++) { cor += linhas[i] + '\n'; if (linhas[i] === '  }') break; }
  const Classe = new Function('return class Importador{' + corpo + '\n' + cor + '}')();
  return new Classe();
}

/* O mesmo formato do arquivo que já existe (", " e ": "), para os modelos antigos não mudarem um byte. */
function serial(v) {
  if (Array.isArray(v)) return '[' + v.map(serial).join(', ') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).map(k => JSON.stringify(k) + ': ' + serial(v[k])).join(', ') + '}';
  return JSON.stringify(v);
}

function contar(discs) {
  let nt = 0, ns = 0;
  discs.forEach(([, , tops]) => tops.forEach(([, subs]) => { nt++; ns += (subs || []).length; }));
  return { nd: discs.length, nt, ns };
}

export function montar() {
  const html = fs.readFileSync(APP, 'utf8');
  const imp = importadorDoApp(html);
  const indice = JSON.parse(fs.readFileSync(path.join(FONTES, 'indice.json'), 'utf8'));
  const modelos = []; const modeloPerda = {};
  for (const m of indice.modelos) {
    const blocos = (m.fontes || [m.id + '.txt']).map(f => fs.readFileSync(path.join(FONTES, f), 'utf8'));
    const lido = imp.parseEdital(blocos.join('\n'));
    const vistos = new Set();
    const discs = lido.map((d, i) => {
      const nome = (m.renomear && m.renomear[d.disc]) || d.disc;
      if (vistos.has(nome.toLowerCase())) throw new Error(m.id + ': disciplina repetida — ' + nome);
      vistos.add(nome.toLowerCase());
      return [nome, imp._editalColor(nome.toLowerCase(), i), d.topics.map(t => [t.name, t.subs])];
    });
    // disciplinas que o edital só NOMEIA (a 1ª fase da OAB não tem programa): entram sem tópicos
    (m.semPrograma || []).forEach(nome => {
      if (vistos.has(nome.toLowerCase())) return;
      vistos.add(nome.toLowerCase());
      discs.push([nome, imp._editalColor(nome.toLowerCase(), discs.length), []]);
    });
    /* Matéria que o edital divide em partes com título próprio ("INFORMÁTICA E ANÁLISE DE DADOS" =
       "Informática: …" + "Análise de Dados: …"): o importador devolve as partes como disciplinas;
       "juntar" as devolve à matéria-mãe — cada parte vira um tópico, e os itens dela, subtópicos. */
    Object.keys(m.juntar || {}).forEach(pai => {
      const filhos = m.juntar[pai];
      const pos = filhos.map(f => discs.findIndex(d => d[0] === f));
      if (pos.some(i => i < 0)) throw new Error(m.id + ': "juntar" cita parte que o importador não devolveu — ' + filhos.filter((f, k) => pos[k] < 0).join(', '));
      const partes = filhos.map((f, k) => { const d = discs[pos[k]]; const itens = [];
        d[2].forEach(([t, subs]) => { itens.push(t); (subs || []).forEach(x => itens.push(x)); });
        return [f, itens]; });
      let ip = discs.findIndex(d => d[0] === pai);
      if (ip < 0) { const primeiro = Math.min(...pos); discs[primeiro] = [pai, imp._editalColor(pai.toLowerCase(), primeiro), partes]; pos.splice(pos.indexOf(primeiro), 1); }
      else discs[ip][2] = discs[ip][2].concat(partes);
      pos.sort((x, y) => y - x).forEach(i => discs.splice(i, 1));
    });
    /* Nada do texto oficial pode se perder no caminho: toda palavra da fonte tem de estar no modelo
       (fora os rótulos que o importador descarta de propósito e os nomes das disciplinas). */
    const palavras = t => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]+/g) || [];
    const conta = {}; palavras(blocos.join('\n')).forEach(w => { conta[w] = (conta[w] || 0) + 1; });
    const total = Object.values(conta).reduce((x, y) => x + y, 0);
    lido.forEach(d => palavras(d.disc).forEach(w => { if (conta[w]) conta[w]--; }));
    discs.forEach(([nome, , tops]) => { const tira = w => { if (conta[w]) conta[w]--; };
      tops.forEach(([t, subs]) => { palavras(t).forEach(tira); (subs || []).forEach(x => palavras(x).forEach(tira)); }); });
    // título que o edital repete em itens seguidos ("Direito das famílias" três vezes) vira UM
    // tópico: as palavras do título repetido não são perda — já estão no nome do tópico
    const titulos = new Set(); discs.forEach(([, , tops]) => tops.forEach(([t]) => palavras(t).forEach(w => titulos.add(w))));
    const sobra = Object.keys(conta).filter(w => conta[w] > 0 && !/^\d+$/.test(w) && !titulos.has(w));
    const perdidas = sobra.reduce((x, w) => x + conta[w], 0);
    // o que pode sobrar são só os rótulos de bloco ("NOÇÕES GERAIS DE DIREITO E FORMAÇÃO HUMANÍSTICA",
    // "A)", "ÁREA DE HABILITAÇÃO") — poucas palavras, cada uma no máximo duas vezes
    if (perdidas > 20 || sobra.some(w => conta[w] > 2)) throw new Error(m.id + ': o modelo perdeu texto da fonte — ' + sobra.slice(0, 30).map(w => w + '×' + conta[w]).join(' '));
    modeloPerda[m.id] = { total, perdidas, amostra: sobra.sort((x, y) => conta[y] - conta[x]).slice(0, 40).map(w => w + '×' + conta[w]) };
    if (m.disciplinas) {   // conferência contra o PDF: a lista esperada, na ordem do edital
      const tem = discs.map(d => d[0]).join(' | '), quer = m.disciplinas.join(' | ');
      if (tem !== quer) throw new Error(m.id + ': as disciplinas lidas não batem com as do edital\n  lidas:    ' + tem + '\n  no edital: ' + quer);
    }
    if (!discs.length) throw new Error(m.id + ': nenhuma disciplina reconhecida');
    modelos.push({ meta: m, discs, ...contar(discs), perda: modeloPerda[m.id] });
  }
  return { html, indice, modelos };
}

function aplicar({ html, modelos }) {
  // 1) conteúdo
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(DADOS, 'utf8'), ctx);
  const D = ctx.window.CT_MODELOS_DATA;
  modelos.forEach(m => { D[m.meta.id] = m.discs; });
  /* Tópico de nome repetido dentro da disciplina some ao aplicar o modelo (o edital junta por
     nome). Todos os modelos — os antigos também, que não têm fonte aqui — passam pela mesma
     desambiguação do importador. Rodar de novo não muda nada. */
  const imp = importadorDoApp(html);
  // Os modelos sem fonte guardam o nome já desambiguado ("Assunto — Conceito"). Para a regra
  // poder melhorar sem ficar presa ao que foi gravado, o prefixo que É o assunto de um tópico
  // anterior sai antes, e a desambiguação refaz tudo do zero.
  const curto = x => String(x || '').split(/[:;(]/)[0].trim().slice(0, 60).replace(/[\s,.\-–]+$/, '');
  const cru = tops => { const vistos = new Set();
    return tops.map(([t, subs]) => { const i = t.indexOf(' — '); let nome = t;
      if (i > 0 && vistos.has(t.slice(0, i))) nome = t.slice(i + 3).replace(/ \(\d+\)$/, '');
      vistos.add(curto(nome)); return { name: nome, subs: subs || [] }; }); };
  Object.keys(D).forEach(id => { D[id] = D[id].map(([nome, cor, tops]) =>
    [nome, cor, imp._edDesambigua(cru(tops)).map(t => (t.subs.length ? [t.name, t.subs] : [t.name]))]); });
  // 2) cartões
  const reIdx = /^const CT_MODELOS = (\[.*\]);$/m;
  const idx = JSON.parse(html.match(reIdx)[1]);
  modelos.forEach(m => {
    const cartao = { id: m.meta.id, nome: m.meta.nome, sub: m.meta.sub, nd: m.nd, nt: m.nt, ns: m.ns };
    const i = idx.findIndex(x => x.id === m.meta.id);
    if (i < 0) idx.push(cartao); else idx[i] = cartao;
  });
  idx.forEach(c => { if (D[c.id]) Object.assign(c, contar(D[c.id])); });   // as contagens saem do conteúdo final
  let novoHtml = html.replace(reIdx, () => 'const CT_MODELOS = ' + serial(idx) + ';');
  // 3) áreas: cada modelo entra na lista das áreas dele (uma vez)
  modelos.forEach(m => (m.meta.areas || []).forEach(area => {
    const re = new RegExp("(\\{id:'" + area + "',[\\s\\S]*?modelos:\\[)([^\\]]*)(\\])");
    if (!re.test(novoHtml)) throw new Error(m.meta.id + ': área desconhecida — ' + area);
    novoHtml = novoHtml.replace(re, (t, a, lista, f) => {
      const ids = lista.split(',').map(x => x.trim().replace(/'/g, '')).filter(Boolean);
      if (ids.indexOf(m.meta.id) < 0) ids.push(m.meta.id);
      return a + ids.map(x => "'" + x + "'").join(',') + f;
    });
  }));
  const cab = '/* Cátedra — conteúdo programático dos modelos de edital (' + Object.keys(D).length + ' concursos).\n'
    + '   Vive FORA do app e é carregado só quando ela abre "Começar com um modelo":\n'
    + '   são centenas de KB que ninguém precisa baixar para registrar uma sessão.\n'
    + '   Os modelos com fonte em scripts/fontes/editais/ são GERADOS por scripts/build-modelos-edital.mjs. */\n';
  return { dados: cab + 'window.CT_MODELOS_DATA = ' + serial(D) + ';\n', html: novoHtml };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const m = montar();
  if (process.argv.includes('--perdas')) m.modelos.forEach(x => console.log(x.meta.id.padEnd(28), String(x.perda.perdidas).padStart(4) + ' de ' + x.perda.total, ' ', x.perda.amostra.join(' ')));
  else m.modelos.forEach(x => console.log(String(x.meta.id).padEnd(16), String(x.nd).padStart(3) + ' disc', String(x.nt).padStart(4) + ' tóp', String(x.ns).padStart(5) + ' sub', ' ' + x.meta.nome + ' · ' + x.meta.sub));
  if (modo !== 'resumo') {
    const r = aplicar(m);
    const mudou = r.dados !== fs.readFileSync(DADOS, 'utf8') || r.html !== m.html;
    if (modo === 'conferir') { console.log(mudou ? 'DESATUALIZADO: rode node scripts/build-modelos-edital.mjs' : 'em dia'); process.exit(mudou ? 1 : 0); }
    fs.writeFileSync(DADOS, r.dados); fs.writeFileSync(APP, r.html);
    console.log(mudou ? 'gravado: modelos-edital.js e Catedra.dc.html' : 'nada mudou');
  }
}
