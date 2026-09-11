/* PASTA SINCRONIZADA — ARQUIVOS ESVAZIADOS PELO iCLOUD (11/09/2026)

   Worktree em ~/Desktop (iCloud "Mesa e Documentos"): o File Provider esvazia arquivos parados
   (flag dataless) e ler um deles obriga o iCloud a baixá-lo — leitura que já voltou errada (o
   playwright-core derrubou a suíte WebKit; o verificador de cores leu um Theme.swift sem o bloco
   que estava lá). scripts/verificar-pasta-sincronizada.mjs roda antes dos builds e da suíte: os
   rastreados sem mudança voltam do git, o resto para com o comando (decisão da dona).

   O que se prova:
   · em qualquer sistema: build-macos.mjs, run.mjs e run-webkit.mjs carregam a checagem no
     PRIMEIRO import; os dois .sh chamam ct_conferir_pasta antes do build-macos; fora do macOS a
     checagem não faz nada (a CI e a Vercel seguem iguais);
   · no macOS, com esvaziamento de mentira — só o File Provider liga a flag, então um `find` no
     PATH troca -flags +dataless por um atributo de teste, e o arquivo "esvaziado" guarda LIXO com
     o tamanho e o mtime do índice, como uma leitura que volta errada:
     – --so-conferir lista e não toca em nada;
     – o rastreado sem mudança volta do git com o conteúdo do git (não o lixo), por troca de
       arquivo (inode novo), com o bit de execução, o índice com o carimbo novo e sem sobras;
     – mudança não commitada, arquivo novo e node_modules param com o comando, intocados;
     – .git esvaziado para sem restaurar nada; saídas de build e ignorados só contam;
     – duas checagens juntas restauram cada arquivo uma vez só; trava órfã é assumida;
     – CATEDRA_IGNORAR_PASTA=1 passa avisando; ct_conferir_pasta para o build e deixa o recado;
   · no macOS, com esvaziamento DE VERDADE quando o repositório está numa pasta sincronizada: uma
     sonda sobe ao iCloud (≈ 11 s medidos) e é esvaziada por FileManager.evictUbiquitousItem, via
     JXA; a checagem a acha sem baixar e a devolve do git.

   Roda sozinho, sem navegador: node tests/pasta-sincronizada.mjs */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { pastaSincronizada } from '../scripts/verificar-pasta-sincronizada.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECAGEM = path.join(RAIZ, 'scripts', 'verificar-pasta-sincronizada.mjs');
const GUARDA = path.join(RAIZ, 'scripts', 'guarda-build.sh');
// Só o File Provider liga a flag dataless; na parte de mentira ela é este atributo.
const MARCA = 'ct.teste.esvaziado';
// Segundos inteiros e no passado: o índice guarda ns = 0 (dá para repor o mtime depois de gravar
// o lixo) e nenhuma entrada fica "racy" (o git zeraria o tamanho guardado no índice).
const MTIME = 1_700_000_000;
const CONTEUDO = (rel) => 'conteúdo de ' + rel + ' que está no git\n';
const MEXIDO = 'trabalho não commitado\n';
// JXA: o FileManager do sistema, sem compilar Swift. NSURL novo a cada pergunta (o objeto guarda cache).
const JXA_SUBIU = 'ObjC.import("Foundation"); function run(a) { return a.map(function (p) { var v = Ref(); '
  + '$.NSURL.fileURLWithPath(p).getResourceValueForKeyError(v, $.NSURLUbiquitousItemIsUploadedKey, null); '
  + 'return v[0] && ObjC.unwrap(v[0]) ? "1" : "0"; }).join(""); }';
const JXA_ESVAZIAR = 'ObjC.import("Foundation"); function run(a) { return a.map(function (p) { '
  + 'return $.NSFileManager.defaultManager.evictUbiquitousItemAtURLError($.NSURL.fileURLWithPath(p), null) ? "1" : "0"; }).join(""); }';

const esperar = (ms) => new Promise(r => setTimeout(r, ms));
const ler = (p) => fs.readFileSync(p, 'utf8');
const git = (dir, ...args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
const jxa = (script, args) => (spawnSync('osascript', ['-l', 'JavaScript', '-e', script, ...args], { encoding: 'utf8' }).stdout || '').trim();
const vazio = (p) => (parseInt(spawnSync('stat', ['-f', '%Xf', p], { encoding: 'utf8' }).stdout, 16) & 0x40000000) !== 0;
const marcar = (...ps) => spawnSync('xattr', ['-w', MARCA, '1', ...ps]);
const marcado = (p) => spawnSync('xattr', ['-p', MARCA, p]).status === 0;

function escrever(dir, rel, txt, modo = 0o644) {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, txt);
  fs.chmodSync(p, modo);
  fs.utimesSync(p, MTIME, MTIME);
  return p;
}

function iniciarRepo(dir, rastreados) {
  git(dir, 'init', '-q');
  for (const [k, v] of [['user.email', 'teste@catedra.local'], ['user.name', 'Teste'], ['commit.gpgsign', 'false']]) git(dir, 'config', k, v);
  escrever(dir, '.gitignore', 'node_modules/\nmac/build/\n.claude/\n');
  for (const rel of rastreados) escrever(dir, rel, CONTEUDO(rel), rel.endsWith('.sh') ? 0o755 : 0o644);
  git(dir, 'add', '-A');
  git(dir, '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture');
  return dir;
}
const repo = (base, nome, rastreados) => iniciarRepo(fs.mkdtempSync(path.join(base, nome + '-')), rastreados);

// "Esvazia" de mentira: grava o que uma leitura errada devolveria (lixo do tamanho certo),
// repõe o mtime do índice e marca. Quem ler o arquivo em vez de ir ao git leva o lixo.
function esvaziar(...ps) {
  for (const p of ps) { fs.writeFileSync(p, Buffer.alloc(fs.statSync(p).size, 0x21)); fs.utimesSync(p, MTIME, MTIME); }
  marcar(...ps);
}
// Trabalho não commitado que o iCloud esvaziou depois: o conteúdo só existe na nuvem.
function mexer(p) { fs.writeFileSync(p, MEXIDO); fs.utimesSync(p, MTIME + 60, MTIME + 60); marcar(p); }

export async function testarPastaSincronizada(ok) {
  const P = 'PASTA ';

  // 1) estático, em qualquer sistema: a checagem roda antes de tudo que lê o repositório
  const semComentarioJs = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const rel of ['scripts/build-macos.mjs', 'tests/run.mjs', 'tests/run-webkit.mjs']) {
    const m = semComentarioJs(fs.readFileSync(path.join(RAIZ, rel), 'utf8')).match(/^import\b.*$/m);
    ok(!!m && /['"](\.\.\/scripts\/|\.\/)verificar-pasta-sincronizada\.mjs['"]/.test(m[0]),
      P + rel + ' confere a pasta no primeiro import, antes de qualquer outro módulo ser lido');
    // import nomeado: um verificador que o iCloud devolva VAZIO falha alto (export inexistente);
    // com `import '…'` ele seria um módulo vazio, e a checagem sumiria calada
    ok(!!m && /^import \{[^}]+\} from/.test(m[0]), P + rel + ' importa um nome do verificador (módulo devolvido vazio falha alto)');
  }
  const guarda = fs.readFileSync(GUARDA, 'utf8');
  ok(/^ct_conferir_pasta\(\) \{/m.test(guarda) && /verificar-pasta-sincronizada\.mjs/.test(guarda) && /export CATEDRA_PASTA_CONFERIDA=1/.test(guarda),
    P + 'scripts/guarda-build.sh tem ct_conferir_pasta, que chama a checagem e deixa o recado ao build-macos.mjs');
  // O recado não pode PULAR a checagem do import: se o node do shell leu o verificador vazio e
  // saiu 0, é o import do build-macos.mjs que ainda confere (e acusa o módulo vazio).
  const fonte = fs.readFileSync(CHECAGEM, 'utf8');
  ok(/\n\} else \{\n  const codigo = rodar\(\);/.test(fonte) && /process\.env\.CATEDRA_PASTA_CONFERIDA === '1'/.test(fonte),
    P + 'o recado do shell só cala a linha repetida; o import confere sempre');
  for (const rel of ['mac/build-app.sh', 'ios/build-ipad.sh']) {
    const txt = fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/^\s*#.*$/gm, '');
    const i = txt.search(/^ct_conferir_pasta "\$ROOT"$/m), j = txt.indexOf('scripts/build-macos.mjs');
    ok(i >= 0 && j > i, P + rel + ' confere a pasta antes de gerar o bundle web');
  }
  ok(/listarEsvaziados\(\[BUNDLE\]\)/.test(fs.readFileSync(path.join(RAIZ, 'tests', 'run-webkit.mjs'), 'utf8')),
    P + 'tests/run-webkit.mjs deixa de fora o bundle esvaziado, em vez de lê-lo');
  const ignore = fs.readFileSync(path.join(RAIZ, '.gitignore'), 'utf8');
  ok(/^\.ct-restaurar-\*\/$/m.test(ignore) && /^\.ct-sonda-\*\/$/m.test(ignore),
    P + 'a pasta temporária da restauração e a sonda estão no .gitignore (e só contam para a checagem)');

  if (process.platform !== 'darwin') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-pasta-'));
    try {
      const r = spawnSync(process.execPath, [CHECAGEM, '--raiz', dir], { encoding: 'utf8' });
      ok(r.status === 0 && !(r.stdout + r.stderr).trim(), P + 'fora do macOS a checagem não faz nada (exit ' + r.status + ')');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    console.log('· ' + P + 'comportamento pulado fora do macOS — dataless é coisa do File Provider');
    return;
  }

  // A sonda real nasce primeiro: o upload corre enquanto a parte de mentira roda.
  const sonda = prepararSonda(P);
  try {
    const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ct-pasta-')));
    try { await parteDeMentira(ok, P, base); }
    finally { fs.rmSync(base, { recursive: true, force: true }); }
    if (sonda) await parteReal(ok, P, sonda);
  } finally {
    if (sonda) fs.rmSync(sonda.dir, { recursive: true, force: true });
  }
}

async function parteDeMentira(ok, P, base) {
  // O find de verdade aceita a flag — senão o de mentira abaixo esconderia um erro de sintaxe.
  const controle = spawnSync('find', [base, '-flags', '+dataless'], { encoding: 'utf8' });
  ok(controle.status === 0 && controle.stdout === '', P + 'o find do sistema aceita -flags +dataless (numa pasta comum, nada esvaziado)');

  const bin = path.join(base, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'find'), [
    '#!/bin/bash',
    '# find de mentira: só o File Provider liga a flag dataless; aqui ela é o atributo ' + MARCA + '.',
    'a=()',
    'while [ $# -gt 0 ]; do',
    '  if [ "$1" = "-flags" ] && [ "${2:-}" = "+dataless" ]; then a+=(-xattrname ' + MARCA + '); shift 2',
    '  else a+=("$1"); shift; fi',
    'done',
    'exec /usr/bin/find "${a[@]}"'].join('\n'), { mode: 0o755 });
  const ENV = { ...process.env, PATH: bin + ':' + process.env.PATH };
  delete ENV.CATEDRA_IGNORAR_PASTA;
  delete ENV.CATEDRA_PASTA_CONFERIDA;
  const checar = (dir, args = [], env = {}) => {
    const r = spawnSync(process.execPath, [CHECAGEM, '--raiz', dir, ...args], { encoding: 'utf8', env: { ...ENV, ...env } });
    return { code: r.status, out: r.stdout, err: r.stderr };
  };
  const checarJunto = (dir) => new Promise(res => {
    const c = spawn(process.execPath, [CHECAGEM, '--raiz', dir], { env: ENV });
    let out = '', err = '';
    c.stdout.on('data', d => { out += d; });
    c.stderr.on('data', d => { err += d; });
    c.on('close', code => res({ code, out, err }));
  });
  const sobras = (dir) => fs.readdirSync(dir).filter(n => n.startsWith('.ct-restaurar-') || n === '.build-lock-pasta');

  // A) rastreados sem mudança: --so-conferir só lista; a checagem os devolve do git
  const a = repo(base, 'limpo', ['limpo.txt', 'sub/pasta/roda.sh', 'intacto.txt']);
  const limpo = path.join(a, 'limpo.txt'), roda = path.join(a, 'sub/pasta/roda.sh');
  esvaziar(limpo, roda);
  const inoAntes = fs.statSync(limpo).ino;
  const so = checar(a, ['--so-conferir']);
  ok(so.code === 4 && /2 rastreados sem mudança voltariam do git/.test(so.out),
    P + '--so-conferir lista os 2 esvaziados que voltariam do git e sai com 4 (exit ' + so.code + ')');
  ok(marcado(limpo) && fs.statSync(limpo).ino === inoAntes && ler(limpo) !== CONTEUDO('limpo.txt'), P + '--so-conferir não toca em nada');
  const ra = checar(a);
  ok(ra.code === 0 && /✓ 2 arquivos esvaziados/.test(ra.out) && !ra.err,
    P + 'os rastreados sem mudança voltam do git e o build segue (exit ' + ra.code + (ra.err ? ': ' + ra.err.split('\n')[0] : '') + ')');
  ok(ler(limpo) === CONTEUDO('limpo.txt') && ler(roda) === CONTEUDO('sub/pasta/roda.sh'),
    P + 'o conteúdo é o do git, e não o lixo que a leitura do arquivo devolveria');
  ok(!marcado(limpo) && fs.statSync(limpo).ino !== inoAntes, P + 'o arquivo é trocado (inode novo), nunca lido nem remendado');
  ok((fs.statSync(roda).mode & 0o111) === 0o111, P + 'o bit de execução volta junto');
  ok(git(a, 'status', '--porcelain').stdout === '' && sobras(a).length === 0, P + 'git status limpo, sem pasta temporária nem trava para trás');
  marcar(limpo);   // o iCloud esvazia de novo: só a flag muda, o mtime da troca fica
  const denovo = checar(a, ['--so-conferir']);
  ok(denovo.code === 4 && /1 rastreado sem mudança voltaria/.test(denovo.out) && !/não commitada/.test(denovo.err),
    P + 'o índice guarda o carimbo da troca: esvaziado de novo, o arquivo segue "sem mudança"');

  // B) o que o git não tem: para com o comando e não toca; o que o git tem volta mesmo assim
  const b = repo(base, 'mexido', ['limpo.txt', 'mexido.txt']);
  const bLimpo = path.join(b, 'limpo.txt'), mexido = path.join(b, 'mexido.txt');
  const novo = escrever(b, 'novo.txt', 'rascunho que ninguém commitou\n');
  const dep = escrever(b, 'node_modules/pacote/index.js', 'module.exports = 1;\n');
  mexer(mexido);
  marcar(novo, dep);
  esvaziar(bLimpo);
  const rb = checar(b);
  ok(rb.code === 4 && /✗ PARADO/.test(rb.err), P + 'mudança não commitada, arquivo novo e node_modules param a checagem (exit ' + rb.code + ')');
  ok(/1 com mudança não commitada[^\n]*\n\s+mexido\.txt/.test(rb.err) && /1 fora do git[^\n]*\n\s+novo\.txt/.test(rb.err)
    && /node_modules:\s+rm -rf node_modules && npm ci/.test(rb.err), P + 'a parada diz o que é cada um e o comando que resolve');
  ok(marcado(mexido) && ler(mexido) === MEXIDO && marcado(novo) && marcado(dep), P + 'o que o git não tem fica intocado');
  ok(!marcado(bLimpo) && ler(bLimpo) === CONTEUDO('limpo.txt') && /✓ 1 arquivo esvaziado/.test(rb.out), P + 'e o que o git tem volta mesmo assim');
  ok(/CATEDRA_IGNORAR_PASTA=1/.test(rb.err), P + 'a parada mostra a saída de emergência');
  const rg = checar(b, [], { CATEDRA_IGNORAR_PASTA: '1' });
  ok(rg.code === 0 && /CATEDRA_IGNORAR_PASTA=1/.test(rg.out) && marcado(mexido), P + 'CATEDRA_IGNORAR_PASTA=1 deixa passar avisando, sem tocar em nada');

  // B2) entrada sem carimbo no índice — o que um `git reset` deixa para cada arquivo que mudou
  //     entre os commits (visto num worktree do Desktop em 11/09/2026): o git não sabe se o disco
  //     tem o conteúdo antigo ou o novo, então restaurar poderia apagar a versão do worktree.
  const b2 = repo(base, 'reset', ['limpo.txt']);
  const b2Limpo = path.join(b2, 'limpo.txt');
  spawnSync('git', ['update-index', '--index-info'], { cwd: b2, input: git(b2, 'ls-files', '-s', 'limpo.txt').stdout });
  ok(/^  mtime: 0:0$/m.test(git(b2, 'ls-files', '--debug', 'limpo.txt').stdout), P + 'controle: a entrada regravada fica sem carimbo, como depois de um reset');
  esvaziar(b2Limpo);
  const rr = checar(b2);
  ok(rr.code === 4 && /1 sem carimbo no índice[^\n]*\n\s+limpo\.txt/.test(rr.err) && marcado(b2Limpo) && !/não commitada/.test(rr.err),
    P + 'sem carimbo no índice: para sem restaurar e diz que o git não sabe se mudou (exit ' + rr.code + ')');

  // C) o próprio .git esvaziado: restaurar dele seria ler pelo iCloud
  const c = repo(base, 'git', ['limpo.txt']);
  const cLimpo = path.join(c, 'limpo.txt');
  esvaziar(cLimpo);
  marcar(path.join(c, '.git', 'HEAD'));
  const rc = checar(c);
  ok(rc.code === 4 && /dentro do próprio git/.test(rc.err) && /nada foi restaurado/.test(rc.err) && marcado(cLimpo),
    P + '.git esvaziado: para sem restaurar nada (exit ' + rc.code + ')');

  // D) saídas de build e ignorados só contam
  const d = repo(base, 'saidas', ['limpo.txt']);
  const saida = escrever(d, 'mac/build/web/index.html', '<!doctype html>\n'), ign = escrever(d, '.claude/launch.json', '{}\n');
  marcar(saida, ign);
  const rd = checar(d);
  ok(rd.code === 0 && /1 arquivo de saída de build esvaziado/.test(rd.out) && /1 arquivo ignorado pelo git esvaziado/.test(rd.out) && !rd.err,
    P + 'saídas de build e arquivos ignorados só entram na contagem (exit ' + rd.code + ')');
  ok(marcado(saida) && marcado(ign), P + 'e ficam como estão');

  // E) duas checagens juntas (Mac × iPad em paralelo): a trava as reveza
  const lote = Array.from({ length: 40 }, (_, i) => 'lote/a' + i + '.txt');
  const e = repo(base, 'juntas', lote);
  esvaziar(...lote.map(r => path.join(e, r)));
  const [r1, r2] = await Promise.all([checarJunto(e), checarJunto(e)]);
  const n = (s) => +((s.match(/✓ (\d+) arquivo/) || [])[1] || 0);
  ok(r1.code === 0 && r2.code === 0 && n(r1.out) + n(r2.out) === 40,
    P + 'duas checagens juntas passam e cada arquivo volta uma vez só (' + n(r1.out) + ' + ' + n(r2.out) + ')');
  ok(lote.every(r => ler(path.join(e, r)) === CONTEUDO(r) && !marcado(path.join(e, r))) && sobras(e).length === 0,
    P + 'nenhum arquivo pela metade, nenhuma sobra');

  // F) trava órfã (a checagem anterior morreu no meio) não prende o próximo build
  const f = repo(base, 'orfa', ['limpo.txt']);
  const fLimpo = path.join(f, 'limpo.txt');
  esvaziar(fLimpo);
  fs.mkdirSync(path.join(f, '.build-lock-pasta'));
  fs.writeFileSync(path.join(f, '.build-lock-pasta', 'pid'), String(spawnSync('true').pid));
  const rf = checar(f);
  ok(rf.code === 0 && !marcado(fLimpo) && sobras(f).length === 0, P + 'trava órfã (dono morto) é assumida e some no fim (exit ' + rf.code + ')');

  // G) o shell dos builds: ct_conferir_pasta para o build ou segue com o recado
  const sh = (dir) => spawnSync('bash', ['-c', 'set -euo pipefail\nsource "$GUARDA"\nct_conferir_pasta "$DIR"\necho "SEGUIU CONFERIDA=${CATEDRA_PASTA_CONFERIDA:-}"'],
    { encoding: 'utf8', env: { ...ENV, GUARDA, DIR: dir } });
  const parou = sh(b);
  ok(parou.status === 4 && !/SEGUIU/.test(parou.stdout), P + 'ct_conferir_pasta para o build com o código da checagem (exit ' + parou.status + ')');
  const h = repo(base, 'shell', ['limpo.txt']);
  const hLimpo = path.join(h, 'limpo.txt');
  esvaziar(hLimpo);
  const seguiu = sh(h);
  ok(seguiu.status === 0 && /SEGUIU CONFERIDA=1/.test(seguiu.stdout) && !marcado(hLimpo),
    P + 'sem pendência, ct_conferir_pasta restaura, segue e deixa o recado ao build-macos.mjs');
}

// Sonda com esvaziamento de verdade: dentro do repositório (é lá que o risco existe), num
// repositório próprio e numa pasta que o .gitignore cobre — uma checagem de build rodando ao
// lado só a conta, não para por causa dela.
function prepararSonda(P) {
  const sinc = pastaSincronizada(RAIZ);
  if (!sinc) { console.log('· ' + P + 'real pulada: o repositório não está numa pasta sincronizada, onde o risco existe'); return null; }
  const dir = path.join(RAIZ, '.ct-sonda-' + process.pid);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir);
  iniciarRepo(dir, ['limpo.txt', 'mexido.txt']);
  const limpo = path.join(dir, 'limpo.txt'), mexido = path.join(dir, 'mexido.txt');
  fs.writeFileSync(mexido, MEXIDO);
  fs.utimesSync(mexido, MTIME + 60, MTIME + 60);
  return { dir, sinc, limpo, mexido, inicio: Date.now() };
}

async function parteReal(ok, P, s) {
  let subiu = false;
  while (Date.now() - s.inicio < 60_000) {
    if (jxa(JXA_SUBIU, [s.limpo, s.mexido]) === '11') { subiu = true; break; }
    await esperar(1000);
  }
  if (!subiu) { console.log('· ' + P + 'real pulada: o ' + s.sinc.provedor + ' não subiu a sonda em 60 s (sem rede?)'); return; }
  const ev = jxa(JXA_ESVAZIAR, [s.limpo, s.mexido]);
  ok(ev === '11' && vazio(s.limpo) && vazio(s.mexido),
    P + 'real: a sonda subiu ao ' + s.sinc.provedor + ' e foi esvaziada de verdade (flag dataless; esvaziar=' + ev + ')');
  if (ev !== '11') return;
  const env = { ...process.env };
  delete env.CATEDRA_IGNORAR_PASTA;
  delete env.CATEDRA_PASTA_CONFERIDA;
  const inoAntes = fs.lstatSync(s.limpo).ino;   // lstat não baixa nada
  const so = spawnSync(process.execPath, [CHECAGEM, '--raiz', s.dir, '--so-conferir'], { encoding: 'utf8', env });
  ok(so.status === 4 && /1 rastreado sem mudança voltaria/.test(so.stdout) && /mudança não commitada/.test(so.stderr) && vazio(s.limpo) && vazio(s.mexido),
    P + 'real: --so-conferir acha os dois pelo find de verdade sem baixar nenhum (exit ' + so.status + ')');
  const r = spawnSync(process.execPath, [CHECAGEM, '--raiz', s.dir], { encoding: 'utf8', env });
  ok(r.status === 4 && !vazio(s.limpo) && fs.lstatSync(s.limpo).ino !== inoAntes && ler(s.limpo) === CONTEUDO('limpo.txt'),
    P + 'real: o arquivo sem mudança volta do git — inode novo, conteúdo do git (exit ' + r.status + ')');
  ok(vazio(s.mexido), P + 'real: o que tem mudança não commitada fica esvaziado, esperando a pessoa');
}

// Execução avulsa: node tests/pasta-sincronizada.mjs
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const falhas = [];
  const ok = (cond, label) => { console.log((cond ? '✓ ' : '✗ ') + label); if (!cond) falhas.push(label); };
  await testarPastaSincronizada(ok);
  console.log(falhas.length ? ('\nFALHAS: ' + falhas.length) : '\nTODOS OS TESTES PASSARAM');
  process.exit(falhas.length ? 1 : 0);
}
