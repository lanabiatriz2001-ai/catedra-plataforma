-- ============================================================================
-- Cátedra · Atividade real dos grupos (ranking semanal, feed e desafio)
-- ----------------------------------------------------------------------------
-- Rode este script UMA VEZ no seu projeto Supabase (DEPOIS do supabase-grupos.sql):
--   Supabase → SQL Editor → New query → cole tudo → Run.
--
-- Cria a tabela `grupo_atividade` (stats semanais por membro) + 2 funções RPC.
-- Padrão de segurança igual ao dos grupos: RLS ligado SEM policies — todo
-- acesso passa pelas funções SECURITY DEFINER, que checam se quem chama
-- pertence ao grupo (auth.uid() em grupos.membros).
-- ============================================================================

-- 1) Tabela: uma linha por (grupo, membro, semana) ------------------------------
create table if not exists public.grupo_atividade (
  grupo_id    uuid not null references public.grupos(id) on delete cascade,
  user_id     uuid not null,
  nome        text not null default 'Membro',
  semana      date not null,                       -- segunda-feira da semana (date_trunc)
  minutos     int  not null default 0,             -- minutos estudados na semana
  streak      int  not null default 0,             -- ofensiva atual (dias)
  revisoes    int  not null default 0,             -- revisões feitas na semana
  updated_at  timestamptz not null default now(),  -- também serve de "visto por último"
  primary key (grupo_id, user_id, semana)
);

alter table public.grupo_atividade enable row level security;
-- Sem policies: nenhum acesso direto à tabela. Tudo passa pelas funções abaixo.

-- 2) Publicar minha atividade em TODOS os meus grupos ---------------------------
create or replace function public.publicar_atividade(p_minutos int, p_streak int, p_revisoes int, p_nome text)
returns void
language plpgsql security definer set search_path = public as $$
declare uid text;
begin
  if auth.uid() is null then raise exception 'nao_autenticado'; end if;
  uid := auth.uid()::text;
  insert into public.grupo_atividade (grupo_id, user_id, nome, semana, minutos, streak, revisoes, updated_at)
  select g.id, auth.uid(),
         coalesce(nullif(trim(p_nome), ''), 'Membro'),
         date_trunc('week', now())::date,
         greatest(0, coalesce(p_minutos, 0)),
         greatest(0, coalesce(p_streak, 0)),
         greatest(0, coalesce(p_revisoes, 0)),
         now()
  from public.grupos g
  where g.membros @> jsonb_build_array(jsonb_build_object('uid', uid))
  on conflict (grupo_id, user_id, semana) do update
    set minutos = excluded.minutos,
        streak  = excluded.streak,
        revisoes = excluded.revisoes,
        nome    = excluded.nome,
        updated_at = now();
end $$;

-- 3) Ranking semanal do grupo (só para quem é membro) ---------------------------
create or replace function public.ranking_grupo(p_grupo_id uuid)
returns table (user_id uuid, nome text, minutos int, streak int, revisoes int, updated_at timestamptz, ao_vivo boolean)
language plpgsql security definer set search_path = public as $$
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
      -- só quem AINDA é membro (quem saiu não aparece)
      and g.membros @> jsonb_build_array(jsonb_build_object('uid', a.user_id::text))
    order by a.minutos desc, a.updated_at desc;
end $$;

-- 4) Permissões ------------------------------------------------------------------
revoke all on function public.publicar_atividade(int, int, int, text) from public, anon;
revoke all on function public.ranking_grupo(uuid)                     from public, anon;
grant execute on function public.publicar_atividade(int, int, int, text) to authenticated;
grant execute on function public.ranking_grupo(uuid)                     to authenticated;

-- Pronto. O app publica sua atividade ao abrir a Comunidade / registrar sessão,
-- e o ranking/feed/desafio do grupo são lidos daqui.
