/* DADO PESSOAL NO REPOSITÓRIO — A MARCA D'ÁGUA DE PDF (01/10/2026)

   O repositório é público. Material de curso carimba no rodapé de cada página uma marca d'água
   com o CPF, o telefone e o nome de quem comprou, e ela entra junto quando se extrai o texto do
   PDF — foi assim que os dados da dona foram parar no juris-text.js. Duas travas:
   · scripts/verificar-segredos.mjs (CI e pré-commit, todos os arquivos rastreados) acusa CPF e
     telefone rotulados, inteiros ou mascarados, e "Nome:" seguido de 3+ palavras em maiúsculas;
   · scripts/verificar-pii.mjs (build, sobre o public/ e o bundle nativo) acusa CPF válido.

   O que se prova:
   · a marca d'água mascarada (dados FALSOS) é acusada nos três tipos, com arquivo:linha;
   · CPF inteiro rotulado também é acusado;
   · NENHUMA das duas travas repete o trecho achado na mensagem — o log da CI é público, e
     repetir o CPF ali seria vazar de novo;
   · caso jurídico legítimo passa: "Tema 951**" (negrito de Markdown colado no número), o
     telefone de SAC citado num julgado, o CPF todo de asteriscos de enunciado de prova e
     "Nome:" seguido de nome em caixa normal.

   Os dados falsos são montados por partes: este arquivo é rastreado, e a varredura do
   repositório inteiro não pode acusar a si mesma.

   Roda sozinho, sem navegador: node tests/pii-verificador.mjs */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERIFICADOR = path.join(RAIZ, 'scripts', 'verificar-segredos.mjs');

const CPF_MASC = '123' + '*****' + '456';
const TEL_MASC = '699' + '*****' + '000';
const NOME_FALSO = 'FULANA DE TAL SILVA';
const MARCA = 'CP' + 'F: ' + CPF_MASC + ' Tele' + 'fone: ' + TEL_MASC + ' No' + 'me: ' + NOME_FALSO;
const CPF_INTEIRO = '1234567' + '8901';

const LEGITIMO = [
  'O STJ fixou a tese no **Tema 951** e mandou aplicá-la aos processos suspensos.',
  'Tema 951** — a consumidora ligou para o telefone 4003-3001 da central e não foi atendida.',
  'Qualifique a parte: Maria, inscrita no CPF ***.***.***-**, residente na rua tal.',
  'Nome: Fulana de Tal Silva — a qualificação vem na primeira linha da petição.',
  'Central de atendimento: telefone 0800 2834628 ou o e-mail do edital.',
].join('\n');

function rodar(dir, nome, texto) {
  const arq = path.join(dir, nome);
  fs.writeFileSync(arq, texto);
  const r = spawnSync(process.execPath, [VERIFICADOR, arq], { cwd: RAIZ, encoding: 'utf8' });
  return { arq, status: r.status, saida: (r.stdout || '') + (r.stderr || '') };
}

export function testarPiiVerificador(ok) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-pii-'));
  try {
    // 1. A marca d'água mascarada, entre duas linhas de texto comum: acusada nos três tipos,
    //    na linha certa, e sem o trecho na mensagem.
    const m = rodar(dir, 'apostila.txt', 'Capítulo 3 — Responsabilidade civil\n' + MARCA + '\nfim da página\n');
    ok(m.status === 1, 'PII VERIFICADOR a marca d\'água mascarada faz o verificador sair com 1 (saiu ' + m.status + ')');
    const linha = m.arq + ':2';
    ok(m.saida.includes(linha + '  CPF rotulado'), 'PII VERIFICADOR acusa o CPF mascarado com arquivo:linha');
    ok(m.saida.includes(linha + '  telefone rotulado'), 'PII VERIFICADOR acusa o telefone mascarado com arquivo:linha');
    ok(m.saida.includes(linha + '  nome rotulado em maiúsculas'), 'PII VERIFICADOR acusa o nome em maiúsculas com arquivo:linha');
    const vazou = [CPF_MASC, TEL_MASC, '*****', 'FULANA', 'SILVA'].filter((t) => m.saida.includes(t));
    ok(vazou.length === 0, 'PII VERIFICADOR a mensagem não repete o trecho achado (' + (vazou.length ? vazou.length + ' pedaço(s) vazaram' : 'nada vazou') + ')');

    // 2. CPF inteiro rotulado, sem máscara nenhuma.
    const i = rodar(dir, 'inteiro.txt', 'rodapé — CP' + 'F: ' + CPF_INTEIRO + ' — uso pessoal\n');
    ok(i.status === 1 && i.saida.includes(i.arq + ':1  CPF rotulado'), 'PII VERIFICADOR acusa CPF inteiro rotulado (saiu ' + i.status + ')');
    ok(!i.saida.includes(CPF_INTEIRO), 'PII VERIFICADOR o CPF inteiro não aparece na mensagem');

    // 3. Caso jurídico legítimo: nada acusado.
    const l = rodar(dir, 'julgado.md', LEGITIMO + '\n');
    ok(l.status === 0 && !/Dado pessoal/.test(l.saida),
      'PII VERIFICADOR "Tema 951**", telefone de SAC, CPF de asteriscos e nome em caixa normal passam (saiu ' + l.status + ')');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

/** A trava do build (verificar-pii.mjs) também não repete o CPF que achou. É assíncrona porque
 *  importa o módulo; o CPF é o de exemplo que a suíte já usa no C1 (válido no dígito). */
export async function testarPiiBuildSemTrecho(ok) {
  const { verificarPII } = await import(pathToFileURL(path.join(RAIZ, 'scripts', 'verificar-pii.mjs')).href);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-pii-build-'));
  const CPF = '529.982' + '.247-25';
  try {
    fs.writeFileSync(path.join(dir, 'vazamento.txt'), 'material de curso — CPF: ' + CPF + ' — não distribuir');
    let msg = '';
    try { verificarPII(dir, { abortar: true, rotulo: 'fixture' }); } catch (e) { msg = String(e && e.message || e); }
    ok(/BUILD ABORTADO/.test(msg) && /CPF formatado/.test(msg), 'PII BUILD a trava do build continua abortando com CPF válido');
    ok(msg !== '' && !msg.includes(CPF) && !msg.includes(CPF.replace(/\D/g, '')), 'PII BUILD a mensagem do build não repete o CPF achado');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// Execução avulsa: node tests/pii-verificador.mjs
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const falhas = [];
  const ok = (cond, label) => { console.log((cond ? '✓ ' : '✗ ') + label); if (!cond) falhas.push(label); };
  testarPiiVerificador(ok);
  await testarPiiBuildSemTrecho(ok);
  console.log(falhas.length ? ('\nFALHAS: ' + falhas.length) : '\nTODOS OS TESTES PASSARAM');
  process.exit(falhas.length ? 1 : 0);
}
