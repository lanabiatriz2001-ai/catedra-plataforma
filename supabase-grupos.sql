-- ============================================================================
-- Cátedra · Grupos de estudo (multiusuário, entra por código)
-- ----------------------------------------------------------------------------
-- Rode este script UMA VEZ no seu projeto Supabase:
--   Supabase → SQL Editor → New query → cole tudo → Run.
--
-- Cria a tabela `grupos` + 4 funções RPC (SECURITY DEFINER) que o app chama.
-- O acesso à tabela é feito SÓ pelas funções (RLS ligado, sem policies diretas),
-- e as funções usam auth.uid() do usuário logado — seguro por padrão.
-- ============================================================================

-- 1) Tabela --------------------------------------------------------------------
create table if not exists public.grupos (
  id         uuid primary key default gen_random_uuid(),
  codigo     text unique not null,
  nome       text not null,
  membros    jsonb not null default '[]'::jsonb,   -- [{ "uid": "...", "nome": "..." }]
  criado_em  timestamptz not null default now()
);

alter table public.grupos enable row level security;
-- Sem policies: nenhum acesso direto à tabela. Tudo passa pelas funções abaixo.

-- 2) Gerador de código curto único --------------------------------------------
create or replace function public._gera_codigo_grupo()
returns text language plpgsql as $$
declare c text; n int;
begin
  loop
    -- 6 caracteres (sem 0/O/1/I para evitar confusão)
    c := upper(translate(substr(md5(random()::text || clock_timestamp()::text), 1, 6),
                         'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                         'ABCDEFGHJKLMNPQRSTUVWXYZ23456789ABCD'));
    select count(*) into n from public.grupos where codigo = c;
    exit when n = 0;
  end loop;
  return c;
end $$;

-- 3) Criar grupo (o criador entra como 1º membro) -----------------------------
create or replace function public.criar_grupo(p_nome text, p_nome_membro text)
returns public.grupos
language plpgsql security definer set search_path = public as $$
declare g public.grupos;
begin
  if auth.uid() is null then raise exception 'nao_autenticado'; end if;
  insert into public.grupos (codigo, nome, membros)
  values (
    public._gera_codigo_grupo(),
    coalesce(nullif(trim(p_nome), ''), 'Grupo de estudo'),
    jsonb_build_array(jsonb_build_object(
      'uid', auth.uid()::text,
      'nome', coalesce(nullif(trim(p_nome_membro), ''), 'Você')
    ))
  )
  returning * into g;
  return g;
end $$;

-- 4) Entrar por código --------------------------------------------------------
create or replace function public.entrar_grupo(p_codigo text, p_nome_membro text)
returns public.grupos
language plpgsql security definer set search_path = public as $$
declare g public.grupos; uid text;
begin
  if auth.uid() is null then raise exception 'nao_autenticado'; end if;
  uid := auth.uid()::text;
  select * into g from public.grupos where codigo = upper(trim(p_codigo));
  if not found then return null; end if;          -- código inexistente → app avisa
  if not (g.membros @> jsonb_build_array(jsonb_build_object('uid', uid))) then
    update public.grupos
      set membros = membros || jsonb_build_array(jsonb_build_object(
            'uid', uid,
            'nome', coalesce(nullif(trim(p_nome_membro), ''), 'Membro')))
      where id = g.id
      returning * into g;
  end if;
  return g;
end $$;

-- 5) Sair do grupo (remove você; apaga o grupo se ficar vazio) -----------------
create or replace function public.sair_grupo(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare uid text; g public.grupos;
begin
  if auth.uid() is null then raise exception 'nao_autenticado'; end if;
  uid := auth.uid()::text;
  update public.grupos
    set membros = (
      select coalesce(jsonb_agg(m), '[]'::jsonb)
      from jsonb_array_elements(membros) m
      where m->>'uid' <> uid
    )
    where id = p_id
    returning * into g;
  if g.id is not null and jsonb_array_length(g.membros) = 0 then
    delete from public.grupos where id = g.id;
  end if;
end $$;

-- 6) Listar meus grupos -------------------------------------------------------
create or replace function public.meus_grupos()
returns setof public.grupos
language sql security definer set search_path = public as $$
  select *
  from public.grupos
  where membros @> jsonb_build_array(jsonb_build_object('uid', auth.uid()::text))
  order by criado_em desc;
$$;

-- 7) Permissões: só usuários logados executam as funções ----------------------
revoke all on function public.criar_grupo(text, text)  from public, anon;
revoke all on function public.entrar_grupo(text, text) from public, anon;
revoke all on function public.sair_grupo(uuid)         from public, anon;
revoke all on function public.meus_grupos()            from public, anon;
grant execute on function public.criar_grupo(text, text)  to authenticated;
grant execute on function public.entrar_grupo(text, text) to authenticated;
grant execute on function public.sair_grupo(uuid)         to authenticated;
grant execute on function public.meus_grupos()            to authenticated;

-- Pronto. O app (Comunidade → Grupos de estudo) já usa estas funções.
