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
import { join, extname, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PADROES = [
  { nome: 'CPF rotulado', re: /CPF:?\s*\d{11}\b/gi },
  { nome: 'CPF formatado', re: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g },
  { nome: 'telefone rotulado', re: /Telefone:?\s*\d{10,11}\b/gi },
  { nome: 'RG rotulado', re: /\bRG:?\s*\d{7,9}\b/gi },
];

// Só texto: binários (png, ico, woff) não têm marca d'água de PDF e dariam ruído.
const EXTS = new Set(['.js', '.html', '.json', '.webmanifest', '.txt', '.css', '.svg', '.mjs']);

/** CPF de gente passa no dígito verificador; CPF de exemplo, não.
 *
 *  POR QUE ISTO EXISTE: o espelho da DPE-SE 2021 ensina a qualificar a parte numa petição e
 *  escreve, na prosa da própria banca, "Maria Silva … inscrita no CPF sob o nº 111.222.333-33
 *  …, residente e domiciliada na rua …". É documento público, e o número é um espaço em
 *  branco com cara de número. Barrar o build por causa dele é o alarme falso que este
 *  arquivo já se preocupava em evitar — e uma trava que grita à toa é uma trava que alguém
 *  desliga. Marca d'água de PDF de curso carrega CPF DE VERDADE, e CPF de verdade valida.
 */
function cpfValido(bruto) {
  const d = String(bruto).replace(/\D/g, '');
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;              // 000…, 111… não são CPF de ninguém
  for (let corte = 9; corte <= 10; corte++) {
    let soma = 0;
    for (let i = 0; i < corte; i++) soma += +d[i] * (corte + 1 - i);
    let dig = (soma * 10) % 11;
    if (dig === 10) dig = 0;
    if (dig !== +d[corte]) return false;
  }
  return true;
}

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

/* O CPF/CNPJ do CONTROLADOR é a única exceção, e ela é estreita de propósito.
 *
 * A LGPD (art. 5º, VI) pede que quem trata os dados se identifique, e os Termos e a Política
 * trazem esse número no corpo do texto — é dado que PRECISA ser publicado, não marca d'água
 * que escapou. Sem esta exceção, preencher docs/juridico/controlador.json aborta todo build.
 *
 * O recorte é por ARQUIVO, e não pelo número, e o motivo é o próprio incidente que criou esta
 * trava: o que vazou no juris-text.js era o CPF DA DONA. Liberar o número em qualquer lugar
 * deixaria passar exatamente aquele caso de novo. Liberado só onde ele é obrigatório, um
 * mesmo número aparecendo em qualquer outro arquivo continua abortando o build. */
const ARQUIVOS_DO_CONTROLADOR = new Set(['termos.html', 'privacidade.html']);

/** Dígitos do cnpjCpf declarado em docs/juridico/controlador.json, ou null se não houver.
 *  O caminho sai da localização DESTE arquivo, e não de process.cwd(): a suíte e os builds
 *  rodam de pastas diferentes, e um cwd inesperado faria a exceção sumir em silêncio — o
 *  build voltaria a abortar sem ninguém entender por quê. */
function numeroDoControlador() {
  try {
    const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
    const p = join(raiz, 'docs', 'juridico', 'controlador.json');
    const d = (JSON.parse(readFileSync(p, 'utf8')).cnpjCpf || '').replace(/\D/g, '');
    return d.length >= 11 ? d : null;
  } catch (_) { return null; }
}

/** Varre `dir`. Devolve a lista de ocorrências; lança se `abortar` e houver alguma. */
export function verificarPII(dir, { abortar = true, rotulo = dir } = {}) {
  const achados = [];
  const doControlador = numeroDoControlador();
  for (const arq of arquivos(dir)) {
    const txt = readFileSync(arq, 'utf8');
    const ehDocumentoJuridico = ARQUIVOS_DO_CONTROLADOR.has(basename(arq).toLowerCase());
    for (const { nome, re } of PADROES) {
      re.lastIndex = 0;
      let hits = txt.match(re);
      // Nos padrões de CPF, só conta o que valida: número de exemplo em modelo de peça
      // (o "111.222.333-33" dos espelhos) não é dado de ninguém.
      if (hits && /CPF/i.test(nome)) hits = hits.filter(cpfValido);
      // …e, nos dois documentos jurídicos, o número do próprio controlador está ali por dever legal.
      if (hits && doControlador && ehDocumentoJuridico) {
        hits = hits.filter((h) => String(h).replace(/\D/g, '') !== doControlador);
      }
      if (hits && hits.length) achados.push({ arq, tipo: nome, quantos: hits.length, exemplo: hits[0] });
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
