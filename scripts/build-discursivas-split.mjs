// scripts/build-discursivas-split.mjs — divide o banco de discursivas em dois módulos.
//
// POR QUE: discursivas.js saltou de 1,5 MB para 7,6 MB quando os enunciados e espelhos
// passaram a vir extraídos dos PDFs (21/08/2026). No iPad físico o processo web do
// WKWebView não aguenta o parse do literal gigante e o acervo não carrega — a Redação
// abre sem filtros e sem cards. Mac e simulador têm RAM de sobra e escondem o problema.
//
// A divisão: o CATÁLOGO (tudo que filtros, cards e KPIs precisam, com o enunciado
// resumido) fica em discursivas.js (~1,5 MB); os TEXTÕES (enunciado completo e
// espelhoTexto) vão para discursivas-textos.js, carregado sob demanda quando a pessoa
// abre uma prova. O nativo (discursivas.json) continua completo — Swift parseia bem.
//
// Uso: node scripts/build-discursivas-split.mjs  (roda DEPOIS de build-provas-conteudo)
// Entrada: discursivas-completo.js (fonte íntegra). Se não existir, promove o
// discursivas.js atual (ainda gordo) a fonte e então divide.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONTE = join(ROOT, 'discursivas-completo.js');
const LEVE = join(ROOT, 'discursivas.js');
const TEXTOS = join(ROOT, 'discursivas-textos.js');

if (!existsSync(FONTE)) {
  // primeira execução: o discursivas.js atual (completo) vira a fonte
  writeFileSync(FONTE, readFileSync(LEVE));
}

globalThis.window = {};
new Function('window', readFileSync(FONTE, 'utf8'))(globalThis.window);
const LISTA = globalThis.window.CT_DISCURSIVAS || [];
if (!LISTA.length) throw new Error('fonte vazia');

const resumo = (t) => {
  const s = String(t || '');
  if (s.length <= 320) return s;
  const corte = s.slice(0, 320);
  const i = corte.lastIndexOf(' ');
  return corte.slice(0, i > 200 ? i : 320) + '…';
};

const textos = {};
const leve = LISTA.map((q) => {
  const temTextoFull = !!q.temTexto && String(q.enunciado || '').length > 320;
  const temEspelhoTexto = !!q.espelhoTexto;
  if (temTextoFull || temEspelhoTexto) {
    textos[q.id] = {};
    if (temTextoFull) textos[q.id].en = q.enunciado;
    if (temEspelhoTexto) textos[q.id].et = q.espelhoTexto;
  }
  const { espelhoTexto, enunciadoOriginal, ...resto } = q;
  return { ...resto, enunciado: temTextoFull ? resumo(q.enunciado) : q.enunciado,
    temTextoFull, temEspelhoTexto };
});

const cab = (o) => `// GERADO por scripts/build-discursivas-split.mjs a partir de discursivas-completo.js.\n// Não editar à mão — edite a fonte e rode o split. ${o}\n`;
writeFileSync(LEVE, cab('Catálogo leve: filtros, cards e KPIs.')
  + 'window.CT_DISCURSIVAS=' + JSON.stringify(leve) + ';\n');
writeFileSync(TEXTOS, cab('Textões sob demanda: enunciado completo (en) e padrão de resposta (et) por id.')
  + 'window.CT_DISCURSIVAS_TEXTOS=' + JSON.stringify(textos) + ';\n');

const mb = (p) => (readFileSync(p).length / 1048576).toFixed(1);
console.log(`discursivas.js (leve): ${mb(LEVE)} MB · discursivas-textos.js: ${mb(TEXTOS)} MB · fonte: ${mb(FONTE)} MB`);
console.log(`itens: ${leve.length} · com texto completo: ${Object.keys(textos).length}`);
