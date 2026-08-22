/* ==========================================================================
   Gera dados/<nome>/ — os arquivos gigantes fatiados em blocos sob demanda.
   PROBLEMA: abrir UM verbete baixava e parseava juris-text.js inteiro (10 MB).
   Somados, juris-text, contas-text, leis-seca, oral-conteudo e discursivas
   passam de 35 MB de JavaScript.
   SOLUÇÃO: cada mapa chave→valor vira N blocos JSON. A fatia de uma chave é
   calculada por hash, então NÃO existe índice chave→fatia para baixar antes —
   o manifesto é de poucas centenas de bytes. Blocos têm o hash do conteúdo no
   nome, o que os torna imutáveis e cacheáveis para sempre (ver sw.js e ct-dados.js).
   Rode com:  node scripts/build-fatias.mjs
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DESTINO = path.join(raiz, 'dados');
const ALVO_BYTES = 160 * 1024;         // tamanho de bloco que se busca

/* Os arquivos fatiáveis. Acrescentar um é acrescentar uma linha — desde que o
   global seja um objeto chave→valor. Arquivos que são ARRAY precisam de uma
   chave: informe `chaveDe` para extraí-la. */
const FONTES = [
  // modo 'hash': muitas chaves pequenas — a fatia sai do hash da chave, manifesto minúsculo
  { nome:'juris-text',  arquivo:'juris-text.js',  global:'__JURIS_TXT__',  modo:'hash' },
  { nome:'contas-text', arquivo:'contas-text.js', global:'__CONTAS_TXT__', modo:'hash' },
  // modo 'chave': poucas chaves ENORMES (a Constituição sozinha tem ~1 MB) — hash aqui
  // só criaria blocos vazios e um bloco gigante. Um arquivo por chave, e o manifesto
  // carrega o mapa, que com 14 leis não custa nada.
  { nome:'leis-seca',   arquivo:'leis-seca.js',   global:'CT_LEIS', modo:'chave', chaveDe:l=>l.sigla },
];

/* FNV-1a de 32 bits. Precisa ser IDÊNTICO ao de ct-dados.js — se um dos dois
   mudar, a chave cai na fatia errada e o dado "some". */
function fnv1a(s){
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++){
    h ^= s.charCodeAt(i);
    h = (h + ((h<<1) + (h<<4) + (h<<7) + (h<<8) + (h<<24))) >>> 0;
  }
  return h >>> 0;
}
const hash8 = txt => crypto.createHash('sha256').update(txt).digest('hex').slice(0,8);

function carregar(arquivo, nomeGlobal){
  const src = fs.readFileSync(path.join(raiz, arquivo), 'utf8');
  const ctx = { window:{} };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { timeout: 60000 });
  const v = ctx.window[nomeGlobal];
  if (!v) throw new Error(arquivo + ' não definiu window.' + nomeGlobal);
  return v;
}

fs.mkdirSync(DESTINO, { recursive: true });
const resumo = [];

for (const f of FONTES){
  const caminho = path.join(raiz, f.arquivo);
  if (!fs.existsSync(caminho)){ console.log('· pulando', f.arquivo, '(não existe)'); continue; }

  const bruto = carregar(f.arquivo, f.global);
  /* array vira mapa pela chave informada */
  const mapa = Array.isArray(bruto)
    ? Object.fromEntries(bruto.map((v,i)=>[String(f.chaveDe ? f.chaveDe(v) : i), v]))
    : bruto;

  const chaves = Object.keys(mapa);
  const bytes = fs.statSync(caminho).size;
  const n = Math.max(1, Math.round(bytes / ALVO_BYTES));

  const pasta = path.join(DESTINO, f.nome);
  fs.rmSync(pasta, { recursive:true, force:true });
  fs.mkdirSync(pasta, { recursive:true });

  const modo = f.modo || 'hash';
  let arquivos, mapaArquivos = null, blocos;

  if (modo === 'chave'){
    mapaArquivos = {};
    arquivos = chaves.map(k=>{
      const txt = JSON.stringify({ [k]: mapa[k] });
      const slug = String(k).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase().slice(0,40) || 'x';
      const nome = slug + '-' + hash8(txt) + '.json';
      fs.writeFileSync(path.join(pasta, nome), txt, 'utf8');
      mapaArquivos[k] = nome;
      return nome;
    });
    blocos = arquivos.length;
  } else {
    const baldes = Array.from({length:n}, ()=>({}));
    for (const k of chaves) baldes[fnv1a(k) % n][k] = mapa[k];
    arquivos = baldes.map((b,i)=>{
      const txt = JSON.stringify(b);
      const nome = i + '-' + hash8(txt) + '.json';
      fs.writeFileSync(path.join(pasta, nome), txt, 'utf8');
      return nome;
    });
    blocos = n;
  }

  const tamanhos = arquivos.map(a=>fs.statSync(path.join(pasta,a)).size);
  const manifesto = {
    nome:f.nome, global:f.global, origem:f.arquivo, modo,
    gerado:new Date().toISOString().slice(0,10),
    n:blocos, chaves:chaves.length, arquivos,
    ...(mapaArquivos ? { mapa:mapaArquivos } : {}),
    bytesOriginal:bytes,
    bytesMedioBloco:Math.round(tamanhos.reduce((a,b)=>a+b,0)/blocos),
    bytesMaiorBloco:Math.max(...tamanhos)
  };
  fs.writeFileSync(path.join(pasta,'manifesto.json'), JSON.stringify(manifesto), 'utf8');

  resumo.push({ nome:f.nome, modo, blocos, chaves:chaves.length,
    de:(bytes/1048576).toFixed(1)+' MB',
    bloco:(manifesto.bytesMedioBloco/1024).toFixed(0)+' KB (maior '+(manifesto.bytesMaiorBloco/1024).toFixed(0)+' KB)' });
}

fs.writeFileSync(path.join(DESTINO,'indice.json'),
  JSON.stringify({ gerado:new Date().toISOString().slice(0,10), fontes:resumo.map(r=>r.nome) }), 'utf8');

console.table(resumo);
console.log('Blocos em dados/. Nomes carregam o hash do conteúdo — são imutáveis e o service worker os serve do cache.');
