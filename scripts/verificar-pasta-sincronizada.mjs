// scripts/verificar-pasta-sincronizada.mjs — arquivos esvaziados pelo iCloud, antes de qualquer leitura.
//
//   import './verificar-pasta-sincronizada.mjs';          // PRIMEIRO import de quem lê o repositório
//   node scripts/verificar-pasta-sincronizada.mjs [--raiz <pasta>] [--so-conferir]
//
// POR QUE EXISTE (11/09/2026): os worktrees do Claude Code nascem em ~/Desktop, pasta que o
// iCloud ("Mesa e Documentos") sincroniza. O File Provider ESVAZIA arquivos parados (flag
// `dataless`: nome, tamanho e mtime continuam, o conteúdo só existe na nuvem), e ler um deles
// obriga o iCloud a baixá-lo na hora. Num worktree com 528 arquivos esvaziados essa leitura
// voltou errada duas vezes: o coreBundle.js do playwright-core veio com o tamanho certo e o
// conteúdo trocado (a suíte WebKit morreu no require), e o verificador de cores não achou o
// bloco `var color: Color {` num Theme.swift que, minutos depois, batia com o git. Quando o
// lixo não derruba um verificador, ele vai parar no bundle dos apps.
//
// O que se mediu, e decide o desenho:
//   · `find -flags +dataless` acha os esvaziados sem baixar nada (0,06 s no repositório); o
//     lstat também não baixa: devolve tamanho e mtime reais, com 0 blocos.
//   · esvaziar muda o ctime e não o mtime. Com isso `git status` e `git diff` RELEEM cada
//     arquivo esvaziado — a mesma leitura que voltou errada. Esta checagem nunca os chama:
//     "sem mudança" é tamanho + mtime (em ns) iguais aos que o índice guardou.
//   · neste macOS o `brctl` não tem mais `download` nem `evict`; forçar o download seria ler.
//
// DECISÃO DA DONA (11/09/2026): restaurar do próprio git. Os objetos moram no .git do clone,
// fora do iCloud, então a restauração é local, sem rede, e o hash prova que o conteúdo é o do
// índice. Volta do git só o arquivo rastreado cujo tamanho e mtime batem com o índice (ninguém
// mexeu nele). O resto para com o comando, porque o git não tem como devolvê-lo:
//   · mudança não commitada, ou arquivo novo fora do git — o conteúdo só existe no iCloud;
//   · node_modules — reinstalar do cache do npm;
//   · o próprio .git esvaziado — restaurar dele seria ler pelo iCloud.
// Saídas de build (mac/build, ios/build, public) e os demais ignorados pelo git só entram na
// contagem: os builds refazem as saídas, e nenhum script daqui lê os outros como fonte.
//
// A troca é atômica: o git escreve a cópia numa pasta temporária do mesmo volume, o hash é
// conferido lá, e ela entra por rename. Quem estiver lendo ao mesmo tempo (a suíte ao lado de
// um build) vê o arquivo velho ou o novo inteiro, nunca pela metade. Duas checagens juntas
// (Mac × iPad em paralelo) se revezam pela trava .build-lock-pasta.
//
// Fora do macOS não faz nada: `dataless` é coisa do File Provider (a CI e a Vercel seguem iguais).
// Saída de emergência: CATEDRA_IGNORAR_PASTA=1 (para quando a checagem mentir).
// CATEDRA_PASTA_CONFERIDA=1 é o recado de ct_conferir_pasta (scripts/guarda-build.sh): o shell
// acabou de conferir, e o build-macos.mjs chamado em seguida confere de novo sem repetir as linhas
// informativas. Não pula a checagem, de propósito: se o iCloud devolver este arquivo VAZIO ao node
// do shell, ele sai 0 sem conferir nada — e é o import nomeado do build-macos que acusa.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SAIDA_ESVAZIADOS = 4;
// Pastas que os builds refazem do zero: esvaziadas, não enganam ninguém.
const SAIDAS_DE_BUILD = ['mac/build/', 'ios/build/', 'public/'];
const TRAVA = '.build-lock-pasta';
const MOSTRAR = 8;   // caminhos por grupo na mensagem de parada

const casa = (p) => (p === os.homedir() || p.startsWith(os.homedir() + path.sep)) ? '~' + p.slice(os.homedir().length) : p;
const dormir = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const git = (raiz, args, input) => spawnSync('git', ['-c', 'core.quotePath=false', ...args],
  { cwd: raiz, input, encoding: 'utf8', maxBuffer: 1 << 30 });
const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };

/** Arquivos esvaziados (dataless) sob os caminhos dados, em caminho absoluto. Não lê conteúdo. */
export function listarEsvaziados(caminhos) {
  if (process.platform !== 'darwin') return [];
  const existentes = [...new Set(caminhos)].filter(p => fs.existsSync(p));
  const achados = [];
  // em lotes: a restauração confere centenas de arquivos de uma vez, e o argv tem limite
  for (let i = 0; i < existentes.length; i += 200) {
    const r = spawnSync('find', [...existentes.slice(i, i + 200), '-flags', '+dataless', '-print0'],
      { encoding: 'utf8', maxBuffer: 1 << 30 });
    if (r.error) throw r.error;
    achados.push(...r.stdout.split('\0').filter(Boolean));
  }
  return achados;
}

/** A pasta sincronizada (File Provider: iCloud Drive, Dropbox…) que contém `raiz`, ou null.
 *  A raiz de um domínio do File Provider carrega o atributo com.apple.file-provider-domain-id
 *  (~/Desktop e ~/Documents, com "Mesa e Documentos" ligado). */
export function pastaSincronizada(raiz) {
  if (process.platform !== 'darwin') return null;
  const ancestrais = [];
  for (let p = real(raiz); ; p = path.dirname(p)) { ancestrais.push(p); if (p === path.dirname(p)) break; }
  const ATR = 'com.apple.file-provider-domain-id';
  const r = spawnSync('xattr', ancestrais, { encoding: 'utf8' });
  const marcados = new Set((r.stdout || '').split('\n').filter(l => l.endsWith(': ' + ATR))
    .map(l => l.slice(0, -(ATR.length + 2))));
  const pasta = ancestrais.find(a => marcados.has(a));
  if (!pasta) return null;
  const id = (spawnSync('xattr', ['-p', ATR, pasta], { encoding: 'utf8' }).stdout || '').trim();
  return { pasta, provedor: id.startsWith('com.apple.CloudDocs') ? 'iCloud Drive' : (id.split('/')[0] || 'File Provider') };
}

// As pastas do git (a do worktree e a comum), reais e com a barra no fim.
function pastasGit(raiz) {
  const r = git(raiz, ['rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir']);
  const dirs = r.status === 0 ? r.stdout.split('\n').filter(Boolean) : [path.join(raiz, '.git')];
  return [...new Set(dirs.map(d => real(d) + path.sep))];
}

// `git ls-files -s --debug -z`: "<modo> <hash> <estágio>\t<caminho>\0" seguido do stat que o
// índice guardou. É daqui que sai o "sem mudança" — sem ler o arquivo, ao contrário do status.
const RE_INDICE = /(\d{6}) ([0-9a-f]{40,64}) (\d)\t([^\0]*)\0  ctime: \d+:\d+\n  mtime: (\d+):(\d+)\n  dev: \d+\tino: \d+\n  uid: \d+\tgid: \d+\n  size: (\d+)\tflags: [0-9a-f]+\n/y;
function lerIndice(raiz) {
  const r = git(raiz, ['ls-files', '-s', '--debug', '-z']);
  if (r.status !== 0) return null;
  const indice = new Map();
  let pos = 0, m;
  RE_INDICE.lastIndex = 0;
  while ((m = RE_INDICE.exec(r.stdout))) {
    pos = RE_INDICE.lastIndex;
    const [, modo, hash, estagio, rel, s, ns, tamanho] = m;
    const chave = rel.normalize('NFC');
    indice.set(chave, { rel, modo, hash, conflito: estagio !== '0' || indice.has(chave),
      mtimeS: BigInt(s), mtimeNs: BigInt(ns), tamanho: BigInt(tamanho) });
  }
  // formato que eu não entendi (git futuro): melhor ninguém "sem mudança" do que um falso
  return pos === r.stdout.length ? indice : null;
}

/** Separa os esvaziados em grupos. Só lstat e o índice do git: nenhum conteúdo é lido. */
function classificar(raiz, dirsGit, esvaziados) {
  const g = { restauraveis: [], mexidos: [], semCarimbo: [], novos: [], dependencias: [], git: [], saidas: [], ignorados: [] };
  const resto = [];
  for (const abs of esvaziados) {
    const rel = path.relative(raiz, abs);
    if (dirsGit.some(d => (abs + path.sep).startsWith(d)) || rel.startsWith('..')) g.git.push(abs);
    else if (rel === 'node_modules' || rel.startsWith('node_modules/')) g.dependencias.push(rel);
    else if (SAIDAS_DE_BUILD.some(s => rel.startsWith(s))) g.saidas.push(rel);
    else resto.push({ abs, rel });
  }
  if (!resto.length) return g;
  const indice = lerIndice(raiz);
  const fora = [];
  for (const it of resto) {
    const e = indice && indice.get(it.rel.normalize('NFC'));
    if (!e) { fora.push(it); continue; }
    // conflito, link, submódulo ou nome com quebra de linha: nada disso se restaura às cegas
    if (e.conflito || !/^100(644|755)$/.test(e.modo) || it.rel.includes('\n')) { g.mexidos.push(it.rel); continue; }
    let st;
    try { st = fs.lstatSync(it.abs, { bigint: true }); } catch { continue; }   // sumiu no meio: nada a fazer
    const s = st.mtimeNs / 1_000_000_000n, ns = st.mtimeNs % 1_000_000_000n;
    // o índice guarda o tamanho em 32 bits; ns = 0 no índice é git sem nanossegundos
    const semMudanca = (st.size & 0xffffffffn) === e.tamanho && s === e.mtimeS && (e.mtimeNs === 0n || ns === e.mtimeNs);
    if (semMudanca) g.restauraveis.push({ abs: it.abs, rel: e.rel, hash: e.hash });
    // Entrada sem carimbo (mtime 0:0, tamanho 0): um `reset` que regravou o índice sem reconferir
    // o disco — num worktree do Desktop, 585 de 600 entradas estavam assim. O git não sabe se o
    // arquivo mudou, e restaurar poderia apagar a versão que está no worktree.
    else if (e.mtimeS === 0n && e.tamanho === 0n) g.semCarimbo.push(it.rel);
    else g.mexidos.push(it.rel);
  }
  if (fora.length) {
    // fora do índice: o que o .gitignore cobre só conta; o resto é trabalho novo da pessoa
    const r = git(raiz, ['check-ignore', '-z', '--stdin'], fora.map(f => f.rel).join('\0') + '\0');
    const ignorados = new Set((r.stdout || '').split('\0').filter(Boolean).map(x => x.normalize('NFC')));
    for (const f of fora) (ignorados.has(f.rel.normalize('NFC')) ? g.ignorados : g.novos).push(f.rel);
  }
  return g;
}

// git hash-object de cada caminho, na mesma ordem. Só é chamado em arquivo local (recém-escrito).
function hashes(raiz, arquivos) {
  if (!arquivos.length) return [];
  const r = git(raiz, ['hash-object', '--stdin-paths'], arquivos.join('\n') + '\n');
  return r.status === 0 ? r.stdout.trim().split('\n') : [];
}

/** Devolve do git os arquivos esvaziados sem mudança, por troca atômica. */
function restaurar(raiz, itens) {
  const certos = [], falhas = [];
  const tmp = fs.mkdtempSync(path.join(raiz, '.ct-restaurar-'));
  try {
    const r = git(raiz, ['checkout-index', '--prefix=' + tmp + path.sep, '-z', '--stdin'], itens.map(i => i.rel).join('\0'));
    const escritos = r.status === 0 ? hashes(raiz, itens.map(i => path.join(tmp, i.rel))) : [];
    itens.forEach((it, k) => {
      if (escritos[k] !== it.hash) { falhas.push(it.rel); return; }
      fs.renameSync(path.join(tmp, it.rel), it.abs);
      certos.push(it);
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  // Carimbo novo no índice: sem isso, se o iCloud esvaziar o arquivo de novo, o mtime da troca
  // não bateria com o do índice e ele pareceria "mudança não commitada". Falhar aqui (índice
  // travado por outro git) não estraga nada: o arquivo já está certo no lugar.
  if (certos.length) git(raiz, ['update-index', '-q', '-z', '--stdin'], certos.map(i => i.rel).join('\0'));
  // Conferência no lugar, como a dona pediu: git hash-object contra o hash do índice.
  const finais = hashes(raiz, certos.map(i => i.abs));
  const vazios = new Set(listarEsvaziados(certos.map(i => i.abs)));
  const restaurados = [];
  certos.forEach((it, k) => (finais[k] === it.hash && !vazios.has(it.abs) ? restaurados : falhas).push(it.rel));
  return { restaurados, falhas };
}

const vivo = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

// Trava entre checagens do mesmo repositório (mkdir é atômico; o PID diz se o dono vive).
function travar(raiz) {
  const trava = path.join(raiz, TRAVA), pidArq = path.join(trava, 'pid');
  const limite = Date.now() + 120_000;
  for (;;) {
    try {
      fs.mkdirSync(trava);
      fs.writeFileSync(pidArq, String(process.pid));
      return () => fs.rmSync(trava, { recursive: true, force: true });
    } catch (e) { if (e.code !== 'EEXIST') throw e; }
    let dono = 0, idade = 0;
    try { dono = +fs.readFileSync(pidArq, 'utf8'); } catch {}
    try { idade = Date.now() - fs.statSync(trava).mtimeMs; } catch { continue; }   // sumiu: tenta de novo
    // sem PID: o dono acabou de criar a trava, ou morreu antes de escrever — 10 s decidem
    if (dono ? !vivo(dono) : idade > 10_000) { fs.rmSync(trava, { recursive: true, force: true }); continue; }
    if (Date.now() > limite) throw new Error(TRAVA + ' presa pelo PID ' + (dono || '?') + ' há mais de 2 min');
    dormir(150);
  }
}

const listar = (itens) => itens.slice(0, MOSTRAR).map(x => '      ' + x).join('\n')
  + (itens.length > MOSTRAR ? '\n      … e mais ' + (itens.length - MOSTRAR) : '');

/** Confere `raiz` e devolve o código de saída: 0 segue; SAIDA_ESVAZIADOS para. */
export function conferirPasta({ raiz = RAIZ_REPO, soConferir = false } = {}) {
  if (process.platform !== 'darwin') return 0;
  if (process.env.CATEDRA_IGNORAR_PASTA === '1') {
    console.log('⚠  CATEDRA_IGNORAR_PASTA=1 — checagem de arquivos esvaziados pelo iCloud desligada a pedido.');
    return 0;
  }
  raiz = real(raiz);
  const sinc = pastaSincronizada(raiz);
  const onde = sinc ? sinc.provedor + ' (' + casa(sinc.pasta) + ')' : 'File Provider';
  const dirsGit = pastasGit(raiz);
  // a pasta comum de um worktree mora fora dele: entra na varredura, senão um .git esvaziado passaria
  const varrer = () => classificar(raiz, dirsGit, listarEsvaziados([raiz, ...dirsGit.map(d => d.slice(0, -1))
    .filter(d => !(d + path.sep).startsWith(raiz + path.sep))]));

  let g = varrer(), restaurados = [], falhas = [];
  if (!soConferir && g.restauraveis.length && !g.git.length) {
    const soltar = travar(raiz);
    try {
      g = varrer();   // outra checagem pode ter restaurado enquanto esta esperava a trava
      if (g.restauraveis.length && !g.git.length) ({ restaurados, falhas } = restaurar(raiz, g.restauraveis));
      if (!g.git.length) g.restauraveis = [];
    } finally { soltar(); }
  }

  const n = restaurados.length;
  if (n) console.log('✓ ' + (n === 1 ? '1 arquivo esvaziado pelo ' + onde + ' voltou' : n + ' arquivos esvaziados pelo ' + onde + ' voltaram')
    + ' do git — sem rede; git hash-object confere com o índice');
  // CATEDRA_PASTA_CONFERIDA=1: o shell do build acabou de dizer o que é só informação; repetir polui o log
  const repetido = process.env.CATEDRA_PASTA_CONFERIDA === '1';
  if (g.saidas.length && !repetido) console.log('· ' + plural(g.saidas.length, 'arquivo', 'arquivos') + ' de saída de build '
    + (g.saidas.length === 1 ? 'esvaziado' : 'esvaziados') + ' (mac/build, ios/build, public): o build os refaz');
  if (g.ignorados.length && !repetido) console.log('· ' + plural(g.ignorados.length, 'arquivo ignorado', 'arquivos ignorados')
    + ' pelo git ' + (g.ignorados.length === 1 ? 'esvaziado' : 'esvaziados') + ' (ex.: ' + g.ignorados[0]
    + '): não são fonte de build nem de teste');
  if (soConferir && g.restauraveis.length && !g.git.length) console.log('· ' + plural(g.restauraveis.length,
    'rastreado sem mudança voltaria', 'rastreados sem mudança voltariam') + ' do git (rode sem --so-conferir):\n'
    + listar(g.restauraveis.map(i => i.rel)));

  const semDono = [...g.mexidos, ...g.semCarimbo, ...g.novos];
  const parar = semDono.length || g.dependencias.length || g.git.length || falhas.length;
  if (!parar) {
    if (sinc && !repetido && !n && !g.saidas.length && !g.ignorados.length && !g.restauraveis.length)
      console.log('· pasta sincronizada (' + sinc.provedor + ': ' + casa(sinc.pasta) + '): nenhum arquivo esvaziado');
    return soConferir && g.restauraveis.length ? SAIDA_ESVAZIADOS : 0;
  }

  const clone = dirsGit.map(d => d.slice(0, -1)).find(d => path.basename(d) === '.git');
  const msg = ['✗ PARADO: arquivos esvaziados pelo ' + onde + ' que o git não tem como devolver.',
    '  Ler um arquivo esvaziado obriga o iCloud a baixá-lo na hora, e em 11/09/2026 essa leitura',
    '  voltou com conteúdo errado. Nenhum destes foi lido:'];
  if (g.mexidos.length) msg.push('  · ' + g.mexidos.length + ' com mudança não commitada — o conteúdo só existe no iCloud:', listar(g.mexidos));
  if (g.semCarimbo.length) msg.push('  · ' + g.semCarimbo.length + ' sem carimbo no índice (depois de um reset, o git ainda não sabe se mudaram)'
    + ' — o conteúdo só existe no iCloud:', listar(g.semCarimbo));
  if (g.novos.length) msg.push('  · ' + g.novos.length + ' fora do git — o conteúdo só existe no iCloud:', listar(g.novos));
  if (semDono.length) msg.push('    baixe-os (Finder › Baixar agora, ou: cat "<arquivo>" > /dev/null), confira com git status e git diff, e rode de novo.');
  if (g.dependencias.length) msg.push('  · ' + g.dependencias.length + ' em node_modules:  rm -rf node_modules && npm ci --prefer-offline');
  if (g.git.length) msg.push('  · ' + g.git.length + ' dentro do próprio git (ex.: ' + casa(g.git[0]) + '): restaurar dele leria pelo iCloud,',
    '    então nada foi restaurado' + (g.restauraveis.length ? ' (' + plural(g.restauraveis.length, 'rastreado sem mudança espera', 'rastreados sem mudança esperam') + ')' : '')
    + '. Clone de novo fora de ~/Desktop e ~/Documents.');
  if (falhas.length) msg.push('  · ' + plural(falhas.length, 'restaurado não bateu', 'restaurados não bateram') + ' com o índice (git hash-object):', listar(falhas));
  msg.push('  Para não depender disso: worktree fora de ~/Desktop e ~/Documents'
    + (clone ? ' (git -C ' + casa(path.dirname(clone)) + ' worktree add .claude/worktrees/<nome> <branch>).' : '.'),
    '  Saída de emergência, para quando a checagem mentir: CATEDRA_IGNORAR_PASTA=1');
  console.error(msg.join('\n'));
  return SAIDA_ESVAZIADOS;
}

function rodar(opcoes) {
  try { return conferirPasta(opcoes); }
  catch (e) {
    console.error('✗ a checagem de arquivos esvaziados pelo iCloud falhou: ' + String(e && e.message || e).split('\n')[0]
      + '\n  Saída de emergência, para quando a checagem mentir: CATEDRA_IGNORAR_PASTA=1');
    return 1;
  }
}

const ehCLI = process.argv[1] && import.meta.url === pathToFileURL(real(process.argv[1])).href;
if (ehCLI) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--raiz');
  process.exit(rodar({ raiz: i >= 0 ? path.resolve(args[i + 1] || '.') : RAIZ_REPO, soConferir: args.includes('--so-conferir') }));
} else {
  const codigo = rodar();
  if (codigo) process.exit(codigo);
}
