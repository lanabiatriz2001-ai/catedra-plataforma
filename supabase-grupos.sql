-- ============================================================================
-- Cátedra · Grupos de estudo (multiusuário, entra por código)
-- ----------------------------------------------------------------------------
-- ESTE ARQUIVO É O ESPELHO DO BANCO. As funções abaixo foram copiadas das
-- definições REAIS em produção (pg_get_functiondef), não escritas à mão. Se um dia
-- divergirem, o banco é que vale — regenere este arquivo, não o contrário.
--
-- Rode no seu projeto Supabase: SQL Editor → New query → cole tudo → Run.
--
-- O acesso às tabelas é feito SÓ pelas funções: RLS ligada SEM policies (o que
-- FECHA a tabela, não abre — é o oposto do que o aviso "RLS Enabled No Policy" do
-- linter sugere) e, desde o endurecimento para o beta, sem GRANT direto para
-- anon/authenticated.
--
-- ENDURECIMENTO PARA O BETA — o que mudou e por quê
--   · O risco nunca foi vazamento: as tabelas já estavam fechadas. Era que qualquer
--     erro virava PERMANENTE, porque não havia como desfazer nada.
--   · código de convite: 6 caracteres de alfabeto fraco (21 bits) → 8 caracteres
--     de gen_random_bytes (40 bits). get_byte()%32 sobre 0..255 divide 256 por 32
--     exatamente, então não há viés de módulo.
--   · coluna `criador` + excluir_grupo(): o DESFAZER que faltava. Sem ele, um código
--     vazado num print de tela colocava alguém no grupo para sempre.
--   · sair_grupo(): faltava exigir que o chamador FOSSE membro da linha que altera.
--   · publicar_atividade(): tetos em minutos/streak/revisões e nome cortado em 40,
--     para ninguém fixar 2.147.483.647 minutos no ranking.
-- ============================================================================

-- 1) Tabelas -------------------------------------------------------------------
create table if not exists public.grupos (
  id         uuid primary key default gen_random_uuid(),
  codigo     text unique not null,
  nome       text not null,
  membros    jsonb not null default '[]'::jsonb,
  criador    uuid,
  criado_em  timestamptz not null default now()
);
alter table public.grupos add column if not exists criador uuid;
alter table public.grupos enable row level security;
-- Sem policies: nenhum acesso direto. Tudo passa pelas funções abaixo.

alter table public.grupo_atividade drop constraint if exists grupo_atividade_nome_ck;
alter table public.grupo_atividade add  constraint grupo_atividade_nome_ck
  check (char_length(nome) between 1 and 40);

create extension if not exists pgcrypto with schema extensions;

-- 2) Funções (espelho exato da produção) ---------------------------------------

CREATE OR REPLACE FUNCTION public._gera_codigo_grupo()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c text; n int;
begin
  loop
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                             1 + (get_byte(b, i) % 32), 1), '' order by i)
      into c
      from (select extensions.gen_random_bytes(8) as b) s, generate_series(0,7) i;
    select count(*) into n from public.grupos where codigo = c;
    exit when n = 0;
  end loop;
  return c;
end $function$;

CREATE OR REPLACE FUNCTION public.criar_grupo(p_nome text, p_nome_membro text)
 RETURNS grupos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare g public.grupos;
begin
  if auth.uid() is null then raise exception 'nao_autenticado'; end if;
  insert into public.grupos (codigo, nome, membros, criador)
  values (
    public._gera_codigo_grupo(),
    left(coalesce(nullif(trim(p_nome), ''), 'Grupo de estudo'), 60),
    jsonb_build_array(jsonb_build_object(
      'uid',  auth.uid()::text,
      'nome', left(coalesce(nullif(trim(p_nome_membro), ''), 'Você'), 40)
    )),
    auth.uid()
  )
  returning * into g;
  return g;
end $function$;

CREATE OR REPLACE FUNCTION public.entrar_grupo(p_codigo text, p_nome_membro text)
 RETURNS grupos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare g public.grupos; uid text;
begin
  if auth.uid() is null then raise exception 'nao_autenticado'; end if;
  uid := auth.uid()::text;
  select * into g from public.grupos where codigo = upper(trim(p_codigo));
  if not found then return null; end if;
  if not (g.membros @> jsonb_build_array(jsonb_build_object('uid', uid))) then
    update public.grupos
       set membros = membros || jsonb_build_array(jsonb_build_object(
             'uid', uid,
             'nome', left(coalesce(nullif(trim(p_nome_membro), ''), 'Membro'), 40)))
     where id = g.id
     returning * into g;
  end if;
  return g;
end $function$;

-- O desfazer: só quem criou apaga, e a FK em cascata leva o ranking junto.
CREATE OR REPLACE FUNCTION public.excluir_grupo(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n int;
begin
  if auth.uid() is null then raise exception 'nao_autenticado'; end if;
  delete from public.grupos where id = p_id and criador = auth.uid();
  get diagnostics n = row_count;
  if n = 0 then raise exception 'nao_dono'; end if;
end $function$;

CREATE OR REPLACE FUNCTION public.sair_grupo(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid text; g public.grupos;
begin
  if auth.uid() is null then raise exception 'nao_autenticado'; end if;
  uid := auth.uid()::text;
  update public.grupos
     set membros = (
       select coalesce(jsonb_agg(m order by ord), '[]'::jsonb)
       from jsonb_array_elements(membros) with ordinality as t(m, ord)
       where m->>'uid' is distinct from uid
     )
   where id = p_id
     and membros @> jsonb_build_array(jsonb_build_object('uid', uid))
   returning * into g;
  if g.id is not null and jsonb_array_length(g.membros) = 0 then
    delete from public.grupos where id = g.id;
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.meus_grupos()
 RETURNS SETOF grupos
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select *
  from public.grupos
  where membros @> jsonb_build_array(jsonb_build_object('uid', auth.uid()::text))
  order by criado_em desc;
$function$;

CREATE OR REPLACE FUNCTION public.publicar_atividade(p_minutos integer, p_streak integer, p_revisoes integer, p_nome text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid text;
begin
  if auth.uid() is null then raise exception 'nao_autenticado'; end if;
  uid := auth.uid()::text;
  insert into public.grupo_atividade (grupo_id, user_id, nome, semana, minutos, streak, revisoes, updated_at)
  select g.id, auth.uid(),
         left(coalesce(nullif(trim(p_nome), ''), 'Membro'), 40),
         date_trunc('week', now())::date,
         least(10080, greatest(0, coalesce(p_minutos, 0))),
         least(3650,  greatest(0, coalesce(p_streak, 0))),
         least(20000, greatest(0, coalesce(p_revisoes, 0))),
         now()
  from public.grupos g
  where g.membros @> jsonb_build_array(jsonb_build_object('uid', uid))
  on conflict (grupo_id, user_id, semana) do update
    set minutos = excluded.minutos, streak = excluded.streak,
        revisoes = excluded.revisoes, nome = excluded.nome, updated_at = now();
end $function$;

CREATE OR REPLACE FUNCTION public.ranking_grupo(p_grupo_id uuid)
 RETURNS TABLE(user_id uuid, nome text, minutos integer, streak integer, revisoes integer, updated_at timestamp with time zone, ao_vivo boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid text;
begin
  if auth.uid() is null then raise exception 'nao_autenticado'; end if;
  uid := auth.uid()::text;
  if not exists (
    select 1 from public.grupos g
    where g.id = p_grupo_id
      and g.membros @> jsonb_build_array(jsonb_build_object('uid', uid))
  ) then raise exception 'nao_membro'; end if;
  return query
    select a.user_id, a.nome, a.minutos, a.streak, a.revisoes, a.updated_at,
           (a.updated_at > now() - interval '10 minutes') as ao_vivo
    from public.grupo_atividade a
    join public.grupos g on g.id = a.grupo_id
    where a.grupo_id = p_grupo_id
      and a.semana = date_trunc('week', now())::date
      and g.membros @> jsonb_build_array(jsonb_build_object('uid', a.user_id::text))
    order by a.minutos desc, a.updated_at desc;
end $function$;

-- 3) Permissões ----------------------------------------------------------------
-- Nenhum acesso direto às tabelas de grupo. Sem isto, bastava alguém criar uma
-- policy "para facilitar" e a tabela abriria inteira.
revoke all on table public.grupos, public.grupo_atividade from anon, authenticated;
revoke all on function public.excluir_grupo(uuid) from public, anon;
grant  execute on function public.excluir_grupo(uuid) to authenticated;

-- Sincronização do app continua funcionando (e só a própria linha, pelas policies).
revoke all on table public.user_data from anon, authenticated;
grant  select, insert, update on table public.user_data to authenticated;

-- De propósito: RPC nova nasce sem EXECUTE e falha com "permission denied" até
-- receber um grant explícito. Melhor falhar barulhento que nascer aberta.
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on functions from public, anon;
