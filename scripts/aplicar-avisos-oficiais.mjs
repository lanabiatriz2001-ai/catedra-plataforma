/* Repõe, como FATO OFICIAL em CAMPO OFICIAL, os avisos que as Notas do Cátedra carregavam
   (decisão da dona, 03/10/2026 — as notas saíram do acervo; ver scripts/limpar-anotacoes-juris.mjs).
   As decisões, verbete a verbete, estão em docs/avisos-oficiais/avisos-2026-10.json:
     · situacao → a situação do verbete (coluna 8 do juris-index.js), que a tela já mostra e que
                  acende o alerta de superado/cancelado no nativo;
     · ob       → trecho LITERAL da ficha oficial, do informativo ou do inteiro teor, acrescentado
                  às "Informações da fonte";
     · fp       → citação de origem que faltava;
     · classificacao → o verbete rotulado como o que não é ("RECURSOS REPETITIVOS" num julgado da
                  Corte Especial fora do rito; tese do STJ posta como do STF) recebe tribunal, título,
                  tema, órgão e citação da fonte oficial; texto de OUTRO julgado colado nele sai;
     · sic      → o erro de digitação que está na PRÓPRIA fonte fica como publicado e ganha a marca
                  " [sic]" (dentro de citação entre colchetes, " (sic)").
   Verbetes repgeral-* têm o texto travado nos lotes de docs/teses-oficiais/: ali a mudança entra
   na REFERÊNCIA, e quem leva ao acervo é scripts/aplicar-teses-oficiais.py (web e nativo).
   Idempotente: rodar de novo não muda nada.

   Uso:  node scripts/aplicar-avisos-oficiais.mjs            # grava lotes, juris-index.js, juris-text.js
         node scripts/aplicar-avisos-oficiais.mjs --conferir # sai 1 se houver algo a aplicar
         node scripts/aplicar-avisos-oficiais.mjs --nativo ARQ.json   # + patches para o build_corpus.py
   Depois: python3 scripts/aplicar-teses-oficiais.py && node scripts/build-fatias.mjs &&
           node scripts/build-incidencia.mjs && node scripts/build-semana-juris.mjs && node scripts/build-widget-dodia.mjs */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const D = JSON.parse(fs.readFileSync(path.join(RAIZ, 'docs/avisos-oficiais/avisos-2026-10.json'), 'utf8'));
const LOTES = ['l1', 'l2', 'l3', 'l4'].map(l => path.join(RAIZ, 'docs/teses-oficiais', l + '-referencia.json'));
const COL_SITUACAO = 8;

export const marca = (campo) => campo === 'fp' ? ' (sic)' : ' [sic]';
/** Põe a marca logo depois do trecho errado; não repete se já estiver lá. */
export function comSic(texto, trecho, campo) {
  const m = marca(campo);
  if (!texto || !texto.includes(trecho)) return null;            // o trecho sumiu: decisão desatualizada
  return texto.includes(trecho + m) ? texto : texto.replace(trecho, trecho + m);
}
/** Acrescenta o trecho literal às informações da fonte; não repete. */
export function comOb(atual, novo) {
  if (atual && atual.includes(novo)) return atual;
  return atual ? atual + '\n' + novo : novo;
}

function lerJs(arq, prefixo) {
  const bruto = fs.readFileSync(arq, 'utf8');
  if (!bruto.startsWith(prefixo)) throw new Error(arq + ' não começa por ' + prefixo);
  const abre = bruto[prefixo.length], fecha = abre === '[' ? ']' : '}';
  const fim = bruto.lastIndexOf(fecha) + 1;
  return { valor: JSON.parse(bruto.slice(prefixo.length, fim)), cauda: bruto.slice(fim) };
}

function main() {
  const conferir = process.argv.includes('--conferir');
  const iNat = process.argv.indexOf('--nativo');
  const mudancas = [], faltas = [];

  // lotes de referência das teses oficiais
  const lotes = LOTES.map(arq => ({ arq, bruto: fs.readFileSync(arq, 'utf8') })).map(l => ({ ...l, json: JSON.parse(l.bruto) }));
  /* Troca PONTUAL no texto do lote: regravar o JSON inteiro pelo JavaScript mexia em centenas de
     linhas só de formato (o Python grava 1.0, o JS grava 1). Acha o registro pelo id e troca ali o
     valor do campo, na mesma grafia de JSON dos dois lados. */
  const trocaNoLote = (l, id, campo, antes, depois) => {
    const i = l.bruto.indexOf(JSON.stringify(id) + ': {'); if (i < 0) throw new Error(id + ': não achei o registro no texto do lote');
    const de = JSON.stringify(campo) + ': ' + JSON.stringify(antes === undefined ? null : antes), para = JSON.stringify(campo) + ': ' + JSON.stringify(depois);
    const j = l.bruto.indexOf(de, i); if (j < 0) throw new Error(id + '.' + campo + ': valor atual não encontrado no texto do lote');
    l.bruto = l.bruto.slice(0, j) + para + l.bruto.slice(j + de.length); l.mudou = true;
  };
  const regDoLote = (id) => { for (const l of lotes) { const r = (l.json.registros || l.json.aplicar || {})[id]; if (r) return { l, r }; } return null; };

  const pIdx = path.join(RAIZ, 'juris-index.js'), pTxt = path.join(RAIZ, 'juris-text.js');
  const idx = lerJs(pIdx, 'window.__JURIS_IDX__='), txt = lerJs(pTxt, 'window.__JURIS_TXT__=');
  const porId = Object.fromEntries(idx.valor.map(r => [r[0], r]));
  const T = txt.valor;
  const nativo = {};   // id → { campo nativo: valor }
  const NAT = { en: 'enunciado', ob: 'observacao', fp: 'precedentes' };
  const anota = (id, campo, valor) => { (nativo[id] = nativo[id] || {})[campo] = valor; };

  for (const [id, sit] of Object.entries(D.situacao)) {
    const r = porId[id];
    if (!r) { faltas.push(id + ': fora do índice'); continue; }
    if (regDoLote(id)) { faltas.push(id + ': situação de verbete travado se muda no lote, não aqui'); continue; }
    if (r[COL_SITUACAO] !== sit) { mudancas.push(id + '.situacao'); r[COL_SITUACAO] = sit; }
    anota(id, 'situacao', sit);
  }
  for (const [id, novo] of Object.entries(D.ob)) {
    const ref = regDoLote(id);
    if (ref) {
      const v = comOb(ref.r.observacao, novo);
      if (v !== ref.r.observacao) { mudancas.push(id + '.observacao (lote)'); trocaNoLote(ref.l, id, 'observacao', ref.r.observacao, v); ref.r.observacao = v; }
      continue;
    }
    if (!T[id]) { faltas.push(id + ': fora do texto'); continue; }
    const v = comOb(T[id].ob, novo);
    if (v !== T[id].ob) { mudancas.push(id + '.ob'); T[id].ob = v; }
    anota(id, 'observacao', v);
  }
  for (const [id, v] of Object.entries(D.fp)) {
    if (!T[id]) { faltas.push(id + ': fora do texto'); continue; }
    if (T[id].fp !== v) { mudancas.push(id + '.fp'); T[id].fp = v; }
    anota(id, 'precedentes', v);
  }
  for (const [id, campo, trecho] of D.sic) {
    const ref = regDoLote(id);
    if (ref) {
      if (campo !== 'en') { faltas.push(id + ': sic em lote só no enunciado'); continue; }
      const v = comSic(ref.r.enunciado, trecho, campo);
      if (v === null) { faltas.push(id + ': "' + trecho + '" não está no enunciado do lote'); continue; }
      if (v !== ref.r.enunciado) { mudancas.push(id + '.enunciado [sic] (lote)'); trocaNoLote(ref.l, id, 'enunciado', ref.r.enunciado, v); ref.r.enunciado = v; }
      continue;
    }
    const v = comSic(T[id] && T[id][campo], trecho, campo);
    if (v === null) { faltas.push(id + ': "' + trecho + '" não está em ' + campo); continue; }
    if (v !== T[id][campo]) { mudancas.push(id + '.' + campo + ' [sic]'); T[id][campo] = v; }
    anota(id, NAT[campo], { sic: trecho, marca: marca(campo) });
  }

  const NAT_IDX = { 1: 'tribunal', 4: 'titulo', 6: 'tema' }, NAT_TXT = { en: 'enunciado', fp: 'precedentes', og: 'orgaoJulgador', ob: 'observacao' };
  for (const [id, c] of Object.entries(D.classificacao || {})) {
    const r = porId[id];
    if (!r || !T[id]) { faltas.push(id + ': fora do acervo'); continue; }
    if (regDoLote(id)) { faltas.push(id + ': verbete travado em lote não se reclassifica aqui'); continue; }
    for (const [col, v] of Object.entries(c.indice || {})) {
      if (r[+col] !== v) { mudancas.push(id + '.' + NAT_IDX[col]); r[+col] = v; }
      anota(id, NAT_IDX[col], v);
    }
    for (const [campo, v] of Object.entries(c.texto || {})) {
      const atual = T[id][campo] === undefined ? null : T[id][campo];
      if (atual !== v) { mudancas.push(id + '.' + campo); if (v === null) delete T[id][campo]; else T[id][campo] = v; }
      anota(id, NAT_TXT[campo], v);
    }
  }

  if (faltas.length) { console.error('✗ decisões que não casam com o acervo:\n  ' + faltas.join('\n  ')); process.exit(2); }
  console.log(mudancas.length + ' campo(s) ' + (conferir ? 'a aplicar' : 'aplicado(s)') + (mudancas.length ? ': ' + mudancas.slice(0, 6).join(', ') + (mudancas.length > 6 ? '…' : '') : ''));
  if (conferir) process.exit(mudancas.length ? 1 : 0);
  for (const l of lotes) if (l.mudou) { JSON.parse(l.bruto); fs.writeFileSync(l.arq, l.bruto); }
  fs.writeFileSync(pIdx, 'window.__JURIS_IDX__=' + JSON.stringify(idx.valor) + idx.cauda);
  fs.writeFileSync(pTxt, 'window.__JURIS_TXT__=' + JSON.stringify(T) + txt.cauda);
  if (iNat > 0) fs.writeFileSync(process.argv[iNat + 1], JSON.stringify(nativo, null, 1) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
