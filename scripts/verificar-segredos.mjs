#!/usr/bin/env node
// scripts/verificar-segredos.mjs — nenhuma chave de API pode entrar no repositório.
//
// O secret scanning do GitHub só é gratuito em repositório público; este script faz o
// mesmo papel nos dois casos: roda na CI (a cada PR e a cada push na main) e no hook de
// pré-commit (scripts/hooks/pre-commit, ligado por `git config core.hooksPath scripts/hooks`).
//
//   node scripts/verificar-segredos.mjs            # varre todos os arquivos rastreados
//   node scripts/verificar-segredos.mjs --staged   # só o que está no índice (pré-commit)
//   node scripts/verificar-segredos.mjs a.js b.md  # arquivos dados
//
// O que procura: chaves da Anthropic, OpenAI, Vercel AI Gateway, Google, GitHub, AWS,
// chaves privadas PEM e JWTs do Supabase com papel service_role. A chave PUBLICÁVEL do
// Supabase (anon) é pública por desenho e NÃO é acusada. Sai com código 1 ao achar algo.

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

// Os padrões são montados por partes para que este arquivo não se acuse a si mesmo.
const P = (a, b) => new RegExp(a + b, 'g');
const PADROES = [
  { nome: 'chave da Anthropic', re: P('sk-' + 'ant-', '[A-Za-z0-9_-]{20,}') },
  { nome: 'chave da OpenAI', re: P('\\bsk-' + '(?:proj-)?', '[A-Za-z0-9]{32,}\\b') },
  { nome: 'chave do Vercel AI Gateway', re: P('\\bvck' + '_', '[A-Za-z0-9]{20,}\\b') },
  { nome: 'chave de API do Google', re: P('\\bAIza', '[0-9A-Za-z_-]{35}\\b') },
  { nome: 'token do GitHub', re: P('\\bgh[pousr]' + '_', '[A-Za-z0-9]{36,}\\b') },
  { nome: 'token do GitHub (fine-grained)', re: P('\\bgithub_pat' + '_', '[A-Za-z0-9_]{60,}\\b') },
  { nome: 'chave de acesso da AWS', re: P('\\bAKIA', '[0-9A-Z]{16}\\b') },
  { nome: 'chave secreta do Supabase', re: P('\\bsb_' + 'secret_', '[A-Za-z0-9_-]{20,}\\b') },
  { nome: 'chave privada PEM', re: P('-----BEGIN ', '(?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----') },
];
const JWT = /\beyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}\b/g;

const BINARIOS = /\.(png|jpe?g|gif|webp|ico|icns|pdf|woff2?|ttf|otf|zip|gz|mp3|mp4|mov|heic|sqlite|db|bin|app|dSYM)$/i;
const IGNORAR = /^(node_modules|public|\.git|mac\/build|ios\/build|win\/build)\//;

function listar(args) {
  if (args.includes('--staged')) {
    return execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']).toString().split('\0').filter(Boolean);
  }
  const dados = args.filter((a) => !a.startsWith('--'));
  if (dados.length) return dados;
  return execFileSync('git', ['ls-files', '-z']).toString().split('\0').filter(Boolean);
}

function papelDoJwt(payloadB64) {
  try {
    const json = Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const p = JSON.parse(json);
    return p && p.role ? String(p.role) : '';
  } catch { return ''; }
}

const achados = [];
for (const arquivo of listar(process.argv.slice(2))) {
  if (BINARIOS.test(arquivo) || IGNORAR.test(arquivo)) continue;
  let st; try { st = statSync(arquivo); } catch { continue; }
  if (!st.isFile()) continue;
  const texto = readFileSync(arquivo, 'utf8');
  const linhaDe = (idx) => texto.slice(0, idx).split('\n').length;
  for (const { nome, re } of PADROES) {
    re.lastIndex = 0; let m;
    while ((m = re.exec(texto))) achados.push({ arquivo, linha: linhaDe(m.index), nome, trecho: m[0].slice(0, 12) + '…' });
  }
  JWT.lastIndex = 0; let j;
  while ((j = JWT.exec(texto))) {
    const papel = papelDoJwt(j[1]);
    if (papel === 'service_role') achados.push({ arquivo, linha: linhaDe(j.index), nome: 'JWT do Supabase com papel service_role', trecho: j[0].slice(0, 12) + '…' });
  }
}

if (achados.length) {
  console.error('✗ Segredo no repositório — remova antes de commitar (e revogue a chave, se já subiu):');
  for (const a of achados) console.error(`  ${a.arquivo}:${a.linha}  ${a.nome}  (${a.trecho})`);
  process.exit(1);
}
console.log('  ✓ nenhuma chave de API nos arquivos verificados');
