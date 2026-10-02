-- Widgets do Cátedra (Mac, iPad, iPhone), 01/10/2026 — spec docs/superpowers/specs/2026-10-01-widgets-design.md §5.4.
-- O app publica um RESUMO de estudo depois de cada sincronização (widget_publicar, só se o carimbo do estado não
-- for mais velho que o que já está aqui). Cada aparelho recebe um PASSE só de leitura, guardado SÓ como hash, e o
-- widget lê o resumo com ele (widget_ler). Tudo passa por função security definer: as tabelas não têm acesso direto.
-- Aplicar no projeto catedraplataforma (frcnfqxniwzdyykvgqqu) SÓ com o sim da dona. Idempotente.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.widget_resumo (
  user_id uuid primary key references auth.users (id) on delete cascade,
  resumo jsonb not null,
  carimbo bigint not null,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.widget_passe (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  hash text not null unique,
  aparelho text not null default '',
  criado_em timestamptz not null default clock_timestamp(),
  usado_em timestamptz,
  revogado_em timestamptz
);
create index if not exists widget_passe_user_idx on public.widget_passe (user_id);

alter table public.widget_resumo enable row level security;
alter table public.widget_passe enable row level security;
revoke all on public.widget_resumo from anon, authenticated;
revoke all on public.widget_passe from anon, authenticated;

-- Publica o resumo da conta. Só grava se o carimbo (updated_at do user_data, em ms) não for mais velho que o
-- guardado: um aparelho que ainda não sincronizou nunca apaga o resumo mais novo. Devolve se gravou.
create or replace function public.widget_publicar(p_resumo jsonb, p_carimbo bigint)
returns boolean language plpgsql security definer set search_path to 'public'
as $function$
declare uid uuid;
begin
  uid := auth.uid();
  if uid is null then raise exception 'nao_autenticado'; end if;
  if p_resumo is null or jsonb_typeof(p_resumo) <> 'object' then raise exception 'resumo_invalido'; end if;
  if octet_length(p_resumo::text) > 65536 then raise exception 'resumo_grande'; end if;
  if p_carimbo is null or p_carimbo <= 0 then raise exception 'carimbo_invalido'; end if;
  insert into public.widget_resumo as w (user_id, resumo, carimbo, atualizado_em)
    values (uid, p_resumo, p_carimbo, now())
    on conflict (user_id) do update set resumo = excluded.resumo, carimbo = excluded.carimbo, atualizado_em = now()
    where w.carimbo <= excluded.carimbo;
  return found;
end $function$;

-- Emite um passe novo para este aparelho e o devolve UMA vez (em claro). Guarda só o sha256.
-- No máximo 10 ativos por conta: o mais antigo é revogado.
create or replace function public.widget_passe_emitir(p_aparelho text)
returns text language plpgsql security definer set search_path to 'public'
as $function$
declare uid uuid; passe text;
begin
  uid := auth.uid();
  if uid is null then raise exception 'nao_autenticado'; end if;
  passe := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  insert into public.widget_passe (user_id, hash, aparelho)
    values (uid, encode(extensions.digest(passe, 'sha256'), 'hex'), left(coalesce(trim(p_aparelho), ''), 60));
  update public.widget_passe set revogado_em = now()
   where id in (select id from public.widget_passe
                 where user_id = uid and revogado_em is null
                 order by criado_em desc offset 10);
  return passe;
end $function$;

-- Revoga UM passe da própria conta (usado ao sair da conta neste aparelho).
create or replace function public.widget_passe_revogar(p_passe text)
returns boolean language plpgsql security definer set search_path to 'public'
as $function$
declare uid uuid;
begin
  uid := auth.uid();
  if uid is null then raise exception 'nao_autenticado'; end if;
  update public.widget_passe set revogado_em = now()
   where user_id = uid and revogado_em is null
     and hash = encode(extensions.digest(coalesce(p_passe, ''), 'sha256'), 'hex');
  return found;
end $function$;

-- Ajustes → "Desligar todos": revoga todos os passes da conta. Devolve quantos.
create or replace function public.widget_passe_revogar_todos()
returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare uid uuid; n integer;
begin
  uid := auth.uid();
  if uid is null then raise exception 'nao_autenticado'; end if;
  update public.widget_passe set revogado_em = now() where user_id = uid and revogado_em is null;
  get diagnostics n = row_count;
  return n;
end $function$;

-- Ajustes → "Widgets ligados em N aparelhos".
create or replace function public.widget_passes_ativos()
returns integer language sql stable security definer set search_path to 'public'
as $$ select count(*)::int from public.widget_passe where user_id = auth.uid() and revogado_em is null; $$;

-- A ÚNICA função aberta sem sessão: o widget lê o resumo pelo passe. Passe inválido ou revogado → null (o app
-- pede outro). Conta sem resumo ainda → {resumo: null, carimbo: 0}. Nunca devolve nada além do resumo.
create or replace function public.widget_ler(p_passe text)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare p record; r record;
begin
  if p_passe is null or length(p_passe) < 20 or length(p_passe) > 100 then return null; end if;
  select id, user_id, usado_em into p from public.widget_passe
   where hash = encode(extensions.digest(p_passe, 'sha256'), 'hex') and revogado_em is null;
  if not found then return null; end if;
  if p.usado_em is null or p.usado_em < now() - interval '1 hour' then
    update public.widget_passe set usado_em = now() where id = p.id;
  end if;
  select resumo, carimbo into r from public.widget_resumo where user_id = p.user_id;
  if not found then return jsonb_build_object('resumo', null, 'carimbo', 0); end if;
  return jsonb_build_object('resumo', r.resumo, 'carimbo', r.carimbo);
end $function$;

revoke all on function public.widget_publicar(jsonb, bigint) from public, anon;
revoke all on function public.widget_passe_emitir(text) from public, anon;
revoke all on function public.widget_passe_revogar(text) from public, anon;
revoke all on function public.widget_passe_revogar_todos() from public, anon;
revoke all on function public.widget_passes_ativos() from public, anon;
revoke all on function public.widget_ler(text) from public;
grant execute on function public.widget_publicar(jsonb, bigint) to authenticated;
grant execute on function public.widget_passe_emitir(text) to authenticated;
grant execute on function public.widget_passe_revogar(text) to authenticated;
grant execute on function public.widget_passe_revogar_todos() to authenticated;
grant execute on function public.widget_passes_ativos() to authenticated;
grant execute on function public.widget_ler(text) to anon, authenticated;

-- (B') excluir_minha_conta, mesma função da versão 2 (2026-09-25) + as duas tabelas do widget. A régua
-- tests/exclusao-conta-cobertura.mjs lê a migração MAIS NOVA que define a função: por isso ela vive aqui de novo.
-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- (B) A FUNÇÃO. Mesma assinatura, mesmo retorno jsonb, mesmos revoke/grant: o app (auth.js) não muda.
-- Ordem que importa:
--   1. travas (nao_autenticado, admin_nao_pode) antes de qualquer escrita;
--   2. o e-mail é lido de auth.users ANTES dos deletes (sem ele o delete de beta_allow fica mudo);
--   3. grupos: sai de todos (grupo vazio é apagado) e deixa de ser criadora;
--   4. os deletes por user_id; os das tabelas criadas só em migração vão com guarda to_regclass —
--      sem ela, um banco sem a tabela quebraria a função na hora de rodar e NINGUÉM conseguiria
--      excluir a conta, o que é pior que o órfão (obrigação legal, Política 9.2). Os deletes são
--      redundantes com a cascata de (A2), mas protegem um banco em que (A2) ainda não rodou;
--   5. a trilha em admin_log ('versao', 2);
--   6. auth.users por último.
-- FICAM, de propósito:
--   · admin_log — trilha de auditoria (Política §2 e §3, 12 meses); a própria exclusão grava nela;
--   · admins — a trava admin_nao_pode impede conta de administração de chegar aqui;
--   · lista_espera — DECISÃO DA DONA, ainda em aberto: o cadastro veio da página pública (sobre.html),
--     antes da conta e sem vínculo com ela. Se ela decidir apagar, a linha é
--       if to_regclass('public.lista_espera') is not null and em is not null then
--         delete from public.lista_espera where lower(email) = lower(em); end if;
--     e o teste tests/exclusao-conta-cobertura.mjs tira lista_espera da lista de RETIDAS.
-- ════════════════════════════════════════════════════════════════════════════════════════════════
create or replace function public.excluir_minha_conta()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare uid uuid; em text; res jsonb; n_grupos int := 0; g record;
begin
  uid := auth.uid();
  if uid is null then raise exception 'nao_autenticado'; end if;
  if exists (select 1 from public.admins where user_id = uid) then raise exception 'admin_nao_pode'; end if;

  select email into em from auth.users where id = uid;

  for g in select id from public.grupos where membros @> jsonb_build_array(jsonb_build_object('uid', uid::text)) loop
    update public.grupos
       set membros = (
         select coalesce(jsonb_agg(m order by ord), '[]'::jsonb)
         from jsonb_array_elements(membros) with ordinality as t(m, ord)
         where m->>'uid' is distinct from uid::text
       )
     where id = g.id;
    delete from public.grupos where id = g.id and jsonb_array_length(membros) = 0;
    n_grupos := n_grupos + 1;
  end loop;
  update public.grupos set criador = null where criador = uid;

  delete from public.grupo_atividade where user_id = uid;
  delete from public.feedback where user_id = uid;
  delete from public.ai_uso where user_id = uid;
  delete from public.beta_acesso where user_id = uid;
  delete from public.user_data where user_id = uid;
  if to_regclass('public.erros_cliente') is not null then delete from public.erros_cliente where user_id = uid; end if;
  if to_regclass('public.uso_telas') is not null then delete from public.uso_telas where user_id = uid; end if;
  if to_regclass('public.ia_plano') is not null then delete from public.ia_plano where user_id = uid; end if;
  if to_regclass('public.widget_resumo') is not null then delete from public.widget_resumo where user_id = uid; end if;
  if to_regclass('public.widget_passe') is not null then delete from public.widget_passe where user_id = uid; end if;
  if em is not null then delete from public.beta_allow where lower(email) = lower(em); end if;

  res := jsonb_build_object('uid', uid, 'grupos', n_grupos, 'quando', now());
  insert into public.admin_log (quando, admin_uid, admin_email, acao, alvo, detalhe)
    values (now(), uid, null, 'conta_excluida_pela_pessoa', uid::text, jsonb_build_object('grupos', n_grupos, 'versao', 2));

  delete from auth.users where id = uid;
  return res;
end $function$;

revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;
