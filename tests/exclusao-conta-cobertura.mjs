/* "EXCLUIR MINHA CONTA" APAGA TUDO O QUE É DA PESSOA (25/09/2026)

   Ajustes promete "apaga o cadastro e todos os dados de estudo, na nuvem", o confirm diz "apaga
   TUDO" e a Política 9.2 diz que a exclusão remove os dados da nuvem. A RPC
   public.excluir_minha_conta da versão 1 (2026-09-08) deixava para trás, sem prazo: a telemetria
   (erros_cliente, uso_telas), o plano de IA (ia_plano), o e-mail na allowlist (beta_allow) e o
   uid como criador de grupo (grupos.criador). As três primeiras nem tinham FK para auth.users.

   O que se prova, só lendo o SQL do repositório (sem banco, roda na CI):
   · EXC1  a função tem UMA fonte: nenhum supabase-*.sql da raiz a define; vale a migração mais
           nova (por nome) que a contém;
   · EXC2  toda tabela "por conta" — descoberta nas migrações e nos supabase-*.sql por coluna
           user_id, criador, admin_uid ou *email, mais grupos.membros — é apagada/limpa pela
           função ou está na lista de RETIDAS com o motivo escrito. Tabela nova sem cobertura
           reprova aqui;
   · EXC3  tabela que só existe em migração é apagada dentro de `if to_regclass(...)`: sem a
           guarda, um banco sem a tabela quebra a exclusão para todo mundo;
   · EXC4  erros_cliente, uso_telas e ia_plano ganham FK `references auth.users(id) on delete
           cascade` (not valid + validate, com guarda em pg_constraint), com os órfãos apagados
           antes, e erros_cliente ganha índice em user_id;
   · EXC5  as travas continuam (nao_autenticado, admin_nao_pode, trilha em admin_log com
           'versao', 2, security definer, revoke de public/anon, grant a authenticated);
   · EXC6  a ordem: travas antes de qualquer escrita; e-mail lido ANTES dos deletes; auth.users
           apagada por último;
   · EXC7/8 controles da régua (não provam o conserto, provam que a régua enxerga): uma tabela
           sintética `create table public.nova (user_id uuid)` sem delete reprova; a função da
           versão 1 sozinha reprova.
   · INFO  o caminho da administração (admin_apagar_usuario) passa pela mesma régua só como
           relatório, sem reprovar.

   Falso verde a lembrar: este teste passa assim que o .sql entra no repositório, esteja ele
   aplicado no Supabase vivo ou não. A prova no banco é a fumaça de
   docs/aplicar-exclusao-conta-2026-09-25.md.

   Roda sozinho: node tests/exclusao-conta-cobertura.mjs
   Contra outra árvore (ex.: a origin/main exportada): node tests/exclusao-conta-cobertura.mjs <raiz> */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FUNCAO = 'excluir_minha_conta';

// Tabelas por conta que a exclusão pela pessoa MANTÉM, cada uma com o motivo.
export const RETIDAS = {
  admins: 'a trava admin_nao_pode impede conta de administração de se excluir por aqui',
  admin_log: 'trilha de auditoria (Política §2 e §3, 12 meses); a própria exclusão grava nela',
  lista_espera: 'cadastro da página pública (sobre.html), anterior à conta e sem vínculo com ela — decisão da dona',
};

// As três tabelas que nasceram sem FK e precisam de cascata para auth.users.
export const PEDEM_FK = ['erros_cliente', 'uso_telas', 'ia_plano'];

// ── leitura ──────────────────────────────────────────────────────────────────────────────────
export function lerArquivos(raiz = RAIZ) {
  const arqs = [];
  for (const f of fs.readdirSync(raiz).filter((f) => /^supabase-.*\.sql$/.test(f)).sort()) {
    arqs.push({ nome: f, migracao: false, sql: fs.readFileSync(path.join(raiz, f), 'utf8') });
  }
  const mig = path.join(raiz, 'supabase', 'migrations');
  if (fs.existsSync(mig)) {
    for (const f of fs.readdirSync(mig).filter((f) => f.endsWith('.sql')).sort()) {
      arqs.push({ nome: 'supabase/migrations/' + f, migracao: true, sql: fs.readFileSync(path.join(mig, f), 'utf8') });
    }
  }
  return arqs;
}

const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
const norm = (s) => semComentarios(s).toLowerCase().replace(/\s+/g, ' ');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Divide o corpo de um create table pelas vírgulas do primeiro nível de parênteses.
function colunasDoCorpo(corpo) {
  const partes = []; let prof = 0, atual = '';
  for (const ch of corpo) {
    if (ch === '(') prof++;
    if (ch === ')') prof--;
    if (ch === ',' && prof === 0) { partes.push(atual); atual = ''; } else atual += ch;
  }
  partes.push(atual);
  return partes.map((p) => p.trim()).filter(Boolean)
    .filter((p) => !/^(constraint|primary|unique|foreign|check|exclude|like)\b/.test(p))
    .map((p) => p.split(/\s+/)[0].replace(/"/g, ''));
}

// Toda tabela de public com as colunas e onde foi criada/alterada.
export function descobrirTabelas(arqs) {
  const tab = new Map();
  const pega = (nome) => { if (!tab.has(nome)) tab.set(nome, { colunas: new Set(), criadaEm: new Set() }); return tab.get(nome); };
  for (const a of arqs) {
    const s = norm(a.sql);
    for (const m of s.matchAll(/create table (?:if not exists )?public\.(\w+) ?\(/g)) {
      let i = m.index + m[0].length, prof = 1; const ini = i;
      while (i < s.length && prof > 0) { if (s[i] === '(') prof++; else if (s[i] === ')') prof--; i++; }
      const t = pega(m[1]);
      t.criadaEm.add(a.migracao ? 'migracao' : 'raiz');
      for (const c of colunasDoCorpo(s.slice(ini, i - 1))) t.colunas.add(c);
    }
    for (const m of s.matchAll(/alter table (?:if exists )?(?:only )?public\.(\w+) add column (?:if not exists )?(\w+)/g)) {
      pega(m[1]).colunas.add(m[2]);
    }
  }
  return tab;
}

// Colunas que ligam uma linha a uma conta.
const colunaDeConta = (c) => c === 'user_id' || c === 'criador' || c === 'admin_uid' || /email$/.test(c);

export function tabelasPorConta(tab) {
  const r = [];
  for (const [nome, t] of tab) {
    const cols = [...t.colunas].filter(colunaDeConta);
    // grupos.membros é jsonb com {uid}: nenhuma regra de nome de coluna o pega, então vai explícito.
    if (nome === 'grupos' && t.colunas.has('membros')) cols.push('membros');
    if (cols.length) r.push({ nome, colunas: cols, soMigracao: !t.criadaEm.has('raiz') });
  }
  return r.sort((a, b) => a.nome.localeCompare(b.nome));
}

// Corpo e cauda (grants) da definição MAIS NOVA da função, e quem a define.
export function definicaoMaisNova(arqs, funcao = FUNCAO) {
  const re = new RegExp('create (?:or replace )?function public\\.' + funcao + '\\s*\\(', 'i');
  const naRaiz = arqs.filter((a) => !a.migracao && re.test(semComentarios(a.sql))).map((a) => a.nome);
  const nasMig = arqs.filter((a) => a.migracao && re.test(semComentarios(a.sql)));
  if (!nasMig.length) return { naRaiz, arquivo: null, corpo: '', cauda: '' };
  const a = nasMig[nasMig.length - 1];
  return { naRaiz, arquivo: a.nome, ...extrairCorpo(a.sql, funcao) };
}

// Pega o corpo entre as aspas-dólar da ÚLTIMA definição da função no texto.
export function extrairCorpo(sql, funcao) {
  const s = norm(sql);
  const re = new RegExp('create (?:or replace )?function public\\.' + funcao + ' ?\\(', 'g');
  let ult = null; for (const m of s.matchAll(re)) ult = m;
  if (!ult) return { corpo: '', cauda: '' };
  const aposNome = s.slice(ult.index);
  const abre = aposNome.match(/ as (\$\w*\$)/);
  if (!abre) return { corpo: '', cauda: '' };
  const ini = abre.index + abre[0].length;
  const fim = aposNome.indexOf(abre[1], ini);
  return { cabeca: aposNome.slice(0, abre.index), corpo: aposNome.slice(ini, fim), cauda: aposNome.slice(fim + abre[1].length) };
}

// Como uma tabela por conta é coberta no corpo. `u` é a variável do uid, `e` a do e-mail.
function regraDeCobertura(t, u = 'uid', e = 'em') {
  const X = esc(t.nome);
  const regras = [];
  if (t.colunas.includes('user_id')) regras.push({ o: 'delete por user_id', re: new RegExp(`delete from public\\.${X} where user_id ?= ?${u}\\b`) });
  else if (t.colunas.some((c) => /email$/.test(c))) regras.push({ o: 'delete por e-mail', re: new RegExp(`delete from public\\.${X} where lower\\( ?email ?\\) ?= ?lower\\( ?${e} ?\\)`) });
  if (t.colunas.includes('criador')) regras.push({ o: 'criador = null', re: new RegExp(`update public\\.${X} set criador ?= ?null where criador ?= ?${u}\\b`) });
  if (t.colunas.includes('membros')) regras.push({ o: 'sai de membros', re: new RegExp(`membros @> jsonb_build_array\\( ?jsonb_build_object\\( ?'uid', ?${u}::text ?\\) ?\\)[\\s\\S]*m->>'uid' (?:is distinct from|<>) ?${u}::text`) });
  if (t.colunas.includes('admin_uid') && !regras.length) regras.push({ o: 'delete por admin_uid', re: new RegExp(`delete from public\\.${X} where admin_uid ?= ?${u}\\b`) });
  return regras;
}

// ── a régua ──────────────────────────────────────────────────────────────────────────────────
// Devolve { falhas: {caso: [problemas]}, info } para a exclusão pela pessoa.
export function analisar(arqs, { retidas = RETIDAS } = {}) {
  const f = { EXC1: [], EXC2: [], EXC3: [], EXC4: [], EXC5: [], EXC6: [] };
  const tab = descobrirTabelas(arqs);
  const porConta = tabelasPorConta(tab);
  const def = definicaoMaisNova(arqs);

  // EXC1 — uma fonte só.
  if (def.naRaiz.length) f.EXC1.push('a função também é definida na raiz: ' + def.naRaiz.join(', '));
  if (!def.arquivo) f.EXC1.push('nenhuma migração define public.' + FUNCAO);
  const corpo = def.corpo || '';

  // EXC2 — cobertura por tabela.
  const cobertas = [];
  for (const t of porConta) {
    if (retidas[t.nome]) continue;
    const regras = regraDeCobertura(t);
    const faltam = regras.filter((r) => !r.re.test(corpo)).map((r) => r.o);
    if (!regras.length) f.EXC2.push(`${t.nome} (${t.colunas.join(', ')}): sem regra de cobertura`);
    else if (faltam.length) f.EXC2.push(`${t.nome}: falta ${faltam.join(' e ')}`);
    else cobertas.push(t.nome);
  }
  for (const r of Object.keys(retidas)) {
    if (!porConta.some((t) => t.nome === r)) f.EXC2.push(`RETIDA ${r} não existe mais no SQL — tire da lista`);
  }

  // EXC3 — guarda to_regclass nas tabelas que só existem em migração.
  for (const t of porConta) {
    if (!t.soMigracao || retidas[t.nome]) continue;
    const X = esc(t.nome);
    const guarda = new RegExp(`if to_regclass\\( ?'public\\.${X}' ?\\) is not null (?:and [^;]*? )?then (?:delete from|update) public\\.${X}\\b`);
    if (!guarda.test(corpo)) f.EXC3.push(`${t.nome} é só de migração e o delete não tem guarda to_regclass`);
  }

  // EXC4 — FKs em cascata, órfãos antes, índice.
  const migs = arqs.filter((a) => a.migracao);
  for (const X of PEDEM_FK) {
    const x = esc(X);
    const reFk = new RegExp(`alter table public\\.${x} add constraint (\\w+) foreign key \\( ?user_id ?\\) references auth\\.users ?\\( ?id ?\\) on delete cascade not valid`);
    const onde = migs.find((a) => reFk.test(norm(a.sql)));
    if (!onde) { f.EXC4.push(`${X}: sem FK references auth.users(id) on delete cascade not valid`); continue; }
    const s = norm(onde.sql);
    const m = s.match(reFk); const nome = m[1];
    if (!new RegExp(`alter table public\\.${x} validate constraint ${nome}\\b`).test(s)) f.EXC4.push(`${X}: a FK ${nome} não é validada`);
    if (!new RegExp(`conname ?= ?'${nome}'`).test(s.slice(0, m.index))) f.EXC4.push(`${X}: a FK ${nome} não tem guarda em pg_constraint (não é idempotente)`);
    if (!new RegExp(`if to_regclass\\( ?'public\\.${x}' ?\\) is not null`).test(s.slice(0, m.index))) f.EXC4.push(`${X}: a FK não tem guarda to_regclass`);
    const orfaos = new RegExp(`delete from public\\.${x} \\w+ where not exists \\( ?select 1 from auth\\.users \\w+ where \\w+\\.id ?= ?\\w+\\.user_id ?\\)`).exec(s);
    if (!orfaos || orfaos.index > m.index) f.EXC4.push(`${X}: os órfãos não são apagados antes da FK`);
    else if (!/DESTRUTIVA/.test(onde.sql)) f.EXC4.push(`${X}: a limpeza de órfãos não está marcada como DESTRUTIVA`);
  }
  if (!migs.some((a) => /create index if not exists \w+ on public\.erros_cliente ?\( ?user_id ?\)/.test(norm(a.sql)))) {
    f.EXC4.push('erros_cliente: sem índice em user_id (a cascata varreria a tabela)');
  }

  // EXC5 — travas.
  const cab = def.cabeca || '', cauda = def.cauda || '';
  const travas = [
    ['nao_autenticado', /if uid is null then raise exception 'nao_autenticado'/.test(corpo)],
    ['admin_nao_pode', /if exists ?\( ?select 1 from public\.admins where user_id ?= ?uid ?\) then raise exception 'admin_nao_pode'/.test(corpo)],
    ["trilha em admin_log com 'versao', 2", /insert into public\.admin_log[^;]*'conta_excluida_pela_pessoa'[^;]*'versao', ?2/.test(corpo)],
    ['returns jsonb + security definer + search_path', /returns jsonb/.test(cab) && /security definer/.test(cab) && /set search_path/.test(cab)],
    ['revoke de public e anon', /revoke all on function public\.excluir_minha_conta\(\) from public, anon/.test(cauda)],
    ['grant a authenticated', /grant execute on function public\.excluir_minha_conta\(\) to authenticated/.test(cauda)],
  ];
  for (const [nome, passou] of travas) if (!passou) f.EXC5.push('falta: ' + nome);

  // EXC6 — ordem.
  const pos = (re) => { const m = re.exec(corpo); return m ? m.index : -1; };
  const escritas = [...corpo.matchAll(/\b(delete from|update|insert into) [\w.]+/g)].map((m) => ({ i: m.index, s: m[0] }));
  const iTravaAdmin = pos(/raise exception 'admin_nao_pode'/);
  const iEmail = pos(/select email into em from auth\.users where id ?= ?uid/);
  const iAuth = pos(/delete from auth\.users where id ?= ?uid/);
  const outras = escritas.filter((w) => w.i !== iAuth);
  if (iTravaAdmin < 0 || escritas.some((w) => w.i < iTravaAdmin)) f.EXC6.push('há escrita antes das travas');
  if (iEmail < 0) f.EXC6.push('o e-mail não é lido de auth.users (os deletes por e-mail ficam mudos)');
  else if (escritas.some((w) => w.i < iEmail)) f.EXC6.push('o e-mail é lido DEPOIS de um delete/update');
  if (iAuth < 0) f.EXC6.push('auth.users não é apagada');
  else if (outras.some((w) => w.i > iAuth)) f.EXC6.push('auth.users não é a última escrita: ' + outras.filter((w) => w.i > iAuth).map((w) => w.s).join(', '));
  if ((corpo.match(/delete from auth\.users/g) || []).length > 1) f.EXC6.push('auth.users apagada mais de uma vez');

  return { falhas: f, porConta, cobertas, arquivo: def.arquivo };
}

// Relatório do caminho da administração: o que admin_apagar_usuario não apaga por conta própria
// nem por FK em cascata. Só informa.
export function relatorioAdmin(arqs) {
  const tab = descobrirTabelas(arqs);
  const porConta = tabelasPorConta(tab);
  const todo = arqs.map((a) => norm(a.sql)).join('\n');
  let corpo = '';
  for (const a of arqs) { const c = extrairCorpo(a.sql, 'admin_apagar_usuario'); if (c.corpo) corpo = c.corpo; }
  const sobra = [];
  for (const t of porConta) {
    if (RETIDAS[t.nome]) continue;
    const X = esc(t.nome);
    const cascata = new RegExp(`(?:create table (?:if not exists )?public\\.${X} ?\\([^;]*user_id uuid[^,;]*references auth\\.users ?\\( ?id ?\\) on delete cascade|alter table public\\.${X} add constraint \\w+ foreign key \\( ?user_id ?\\) references auth\\.users ?\\( ?id ?\\) on delete cascade)`).test(todo);
    const regras = regraDeCobertura(t, 'p_uid', 'em');
    const faltam = regras.filter((r) => !r.re.test(corpo));
    const soUserId = faltam.length === 1 && faltam[0].o === 'delete por user_id';
    if (faltam.length && !(soUserId && cascata)) sobra.push(`${t.nome} (${faltam.map((r) => r.o).join(', ')})`);
  }
  return sobra;
}

const CASOS = {
  EXC1: 'EXC1 a exclusão tem uma fonte só: a migração mais nova define public.excluir_minha_conta e nenhum supabase-*.sql da raiz',
  EXC2: 'EXC2 toda tabela por conta (user_id, criador, admin_uid, *email, grupos.membros) é apagada/limpa ou está nas RETIDAS com motivo',
  EXC3: 'EXC3 tabela que só existe em migração é apagada sob guarda to_regclass (banco sem a tabela não quebra a exclusão)',
  EXC4: 'EXC4 erros_cliente, uso_telas e ia_plano têm FK em cascata para auth.users (órfãos antes, not valid + validate, guarda em pg_constraint) e índice em erros_cliente(user_id)',
  EXC5: "EXC5 as travas continuam: nao_autenticado, admin_nao_pode, admin_log com 'versao', 2, security definer, revoke/grant",
  EXC6: 'EXC6 a ordem: travas antes de escrever; e-mail lido antes dos deletes; auth.users apagada por último',
};

export async function testarExclusaoContaCobertura(ok, raiz = RAIZ) {
  const arqs = lerArquivos(raiz);
  const r = analisar(arqs);
  for (const [k, rotulo] of Object.entries(CASOS)) {
    ok(r.falhas[k].length === 0, rotulo + (r.falhas[k].length ? ' — ' + r.falhas[k].join('; ') : ''));
  }

  // Controle 1: tabela nova por conta, sem delete, tem de reprovar em EXC2 e EXC3.
  const sint = arqs.concat([{ nome: 'supabase/migrations/9999-controle.sql', migracao: true, sql: 'create table if not exists public.nova (user_id uuid, dado text);' }]);
  const c1 = analisar(sint).falhas;
  ok(c1.EXC2.some((s) => s.startsWith('nova:')) && c1.EXC3.some((s) => s.startsWith('nova ')),
    'EXC7 controle: uma tabela sintética `public.nova (user_id uuid)` sem delete reprova na régua');

  // Controle 2: a função da versão 1 sozinha (sem migração mais nova) reprova.
  const V1 = 'supabase/migrations/2026-09-08-excluir-minha-conta.sql';
  const c2 = analisar(arqs.filter((a) => !(a.migracao && a.nome > V1 && /excluir_minha_conta/.test(a.sql))));
  ok(c2.arquivo === V1 &&c2.falhas.EXC2.length > 0 && c2.falhas.EXC4.length > 0,
    'EXC8 controle: a função da versão 1 (2026-09-08) reprova na mesma régua (' + c2.falhas.EXC2.length + ' furos de cobertura)');

  const sobra = relatorioAdmin(arqs);
  console.log('ℹ EXC-INFO caminho da administração (admin_apagar_usuario) não limpa: '
    + (sobra.length ? sobra.join('; ') : 'nada') + ' — só relatório, decisão da dona');
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const falhas = [];
  const raiz = process.argv[2] ? path.resolve(process.argv[2]) : RAIZ;
  await testarExclusaoContaCobertura((c, l) => { console.log((c ? '✓ ' : '✗ ') + l); if (!c) falhas.push(l); }, raiz);
  process.exit(falhas.length ? 1 : 0);
}
