/* Tira do acervo do JURIS o que não é texto da fonte oficial — decisão da dona (03/10/2026):
   no verbete fica o texto oficial e o que a pessoa mesma marca e anota.

   Os campos "co" e "ob" do juris-text.js misturavam duas coisas. A maior parte é texto da
   própria fonte (as informações do inteiro teor do informativo, a questão submetida, a
   delimitação do julgado, as anotações do NUGEP, o dispositivo de lei transcrito) e FICA.
   O que sai é o que alguém escreveu por cima:
     · "Nota do Cátedra (auditoria…)" — as notas da plataforma;
     · o comentário e a observação dos precedentes obrigatórios (PRECOBR), escritos à mão;
     · chamadas de material de cursinho ("CAIU NO TJPR", "PRECISAMOS AMPLIAR O OLHAR…");
     · as etiquetas "⚠ ATENÇÃO: MUDANÇA DE ENTENDIMENTO" / "🚨 PACIFICAÇÃO DE ENTENDIMENTO"
       coladas antes do texto do tribunal — sai a etiqueta, o texto do tribunal fica.

   Uso:  node scripts/limpar-anotacoes-juris.mjs            # grava juris-text.js
         node scripts/limpar-anotacoes-juris.mjs --conferir # só conta; sai 1 se houver o que tirar
   Depois de gravar, rode os gerados que leem o juris-text.js:
         node scripts/build-fatias.mjs && node scripts/build-semana-juris.mjs && node scripts/build-incidencia.mjs */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARQ = path.join(RAIZ, 'juris-text.js');
const PREFIXO = 'window.__JURIS_TXT__=';

const NOTA_CATEDRA = /Nota do C[áa]tedra/;
const CURSINHO = /^(CAIU NO |PRECISAMOS AMPLIAR O OLHAR)/;
const ETIQUETA = /^[\u26A0\u{1F6A8}]\uFE0F?\s*(ATENÇÃO:\s*)?(MUDANÇA|PACIFICAÇÃO) DE ENTENDIMENTO\s*/u;

/* Devolve o campo limpo: '' quando ele inteiro é anotação, o texto sem a etiqueta quando só
   a etiqueta era de fora, e o próprio texto quando é da fonte. Exportada para o teste. */
export function limpaCampo(id, campo, texto) {
  if (!texto) return texto;
  if (NOTA_CATEDRA.test(texto)) return '';
  if (CURSINHO.test(texto)) return '';
  if (/^PRECOBR-/.test(id)) return '';
  return texto.replace(ETIQUETA, '');
}

function main() {
  const bruto = fs.readFileSync(ARQ, 'utf8');
  if (!bruto.startsWith(PREFIXO)) throw new Error('juris-text.js não começa por ' + PREFIXO);
  const fim = bruto.slice(bruto.lastIndexOf('}') + 1);
  const T = JSON.parse(bruto.slice(PREFIXO.length, bruto.lastIndexOf('}') + 1));
  const conta = { apagados: 0, etiquetas: 0 };
  for (const id of Object.keys(T)) {
    for (const campo of ['co', 'ob']) {
      const antes = T[id][campo];
      if (!antes) continue;
      const depois = limpaCampo(id, campo, antes);
      if (depois === antes) continue;
      if (depois) { T[id][campo] = depois; conta.etiquetas++; }
      else { delete T[id][campo]; conta.apagados++; }
    }
  }
  const so = process.argv.includes('--conferir');
  console.log(`${conta.apagados} anotações ${so ? 'a apagar' : 'apagadas'}, ${conta.etiquetas} etiquetas ${so ? 'a tirar' : 'tiradas'}`);
  if (so) process.exit(conta.apagados + conta.etiquetas ? 1 : 0);
  fs.writeFileSync(ARQ, PREFIXO + JSON.stringify(T) + fim);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
