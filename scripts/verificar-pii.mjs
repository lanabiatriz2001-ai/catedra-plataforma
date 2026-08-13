// scripts/verificar-pii.mjs — trava de segurança dos builds.
//
// POR QUE ISTO EXISTE: material de curso vem com marca d'água pessoal ("CPF: …
// Telefone: … Nome: …") carimbada no rodapé de cada página. Ao extrair o texto de
// um PDF desses, a marca entra junto com o conteúdo. Foi assim que o CPF, o
// telefone e o nome completo da Lana acabaram dentro do campo "ob" de 2 verbetes
// do juris-text.js — e, como esse arquivo é servido sem autenticação nenhuma,
// ficaram abertos na internet.
//
// Esta checagem roda no build e ABORTA se um arquivo de saída contiver marca
// d'água. É deliberadamente estreita: procura o dado ROTULADO (CPF: seguido de 11
// dígitos), não a palavra "CPF" solta — jurisprudência cita "CPF" o tempo todo de
// forma legítima e um alarme falso por página faria a trava ser ignorada.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const PADROES = [
  { nome: 'CPF rotulado', re: /CPF:?\s*\d{11}\b/gi },
  { nome: 'CPF formatado', re: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g },
  { nome: 'telefone rotulado', re: /Telefone:?\s*\d{10,11}\b/gi },
  { nome: 'RG rotulado', re: /\bRG:?\s*\d{7,9}\b/gi },
];

// Só texto: binários (png, ico, woff) não têm marca d'água de PDF e dariam ruído.
const EXTS = new Set(['.js', '.html', '.json', '.webmanifest', '.txt', '.css', '.svg', '.mjs']);

function arquivos(dir) {
  const saida = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    const st = statSync(p);
    if (st.isDirectory()) saida.push(...arquivos(p));
    else if (EXTS.has(extname(nome).toLowerCase())) saida.push(p);
  }
  return saida;
}

/** Varre `dir`. Devolve a lista de ocorrências; lança se `abortar` e houver alguma. */
export function verificarPII(dir, { abortar = true, rotulo = dir } = {}) {
  const achados = [];
  for (const arq of arquivos(dir)) {
    const txt = readFileSync(arq, 'utf8');
    for (const { nome, re } of PADROES) {
      re.lastIndex = 0;
      const hits = txt.match(re);
      if (hits) achados.push({ arq, tipo: nome, quantos: hits.length, exemplo: hits[0] });
    }
  }

  if (achados.length) {
    const linhas = achados.map(
      (a) => `    ${a.arq}: ${a.quantos}× ${a.tipo} (ex.: "${a.exemplo}")`
    );
    const msg =
      `\n✗ BUILD ABORTADO — dado pessoal encontrado em ${rotulo}:\n` +
      linhas.join('\n') +
      `\n\n  Isto seria publicado sem autenticação. Quase sempre é marca d'água de PDF de\n` +
      `  curso que entrou junto com o texto extraído. Limpe o campo na FONTE do arquivo\n` +
      `  (não só na saída, senão volta no próximo build) e rode de novo.\n`;
    if (abortar) throw new Error(msg);
    console.warn(msg);
  } else {
    console.log(`  · sem dado pessoal em ${rotulo} ✓`);
  }
  return achados;
}
