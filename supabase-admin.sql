-- ============================================================================
-- Cátedra · Painel de administrador (só a dona acessa)
-- ----------------------------------------------------------------------------
-- ESPELHO do que está aplicado em produção (frcnfqxniwzdyykvgqqu). Rode no
-- SQL Editor como postgres.
--
-- Modelo de segurança: "só a dona" vale no SERVIDOR. Cada RPC começa checando
-- is_admin() e FALHA COM EXCEÇÃO se não for admin — nunca devolve vazio (vazio é
-- indistinguível de "não tem dado" e esconderia erro de configuração). Esconder o
-- item do menu no cliente é só conveniência.
--
-- Por que uma TABELA de admins e não o metadata do JWT: o próprio usuário consegue
-- escrever no user_metadata dele via supabase.auth.updateUser — confiar nisso seria
-- deixar qualquer um se promover. A tabela só é escrita por quem tem acesso ao banco.
--
-- Limite de privacidade: o painel NÃO devolve conteúdo de estudo (texto de anotação,
-- redação, caderno de erros). Só agregados: contagem de sessões, nº de disciplinas do
-- edital e tamanho do blob. auth.users fornece e-mail e datas (a dona convidou os
-- testadores, então ver o e-mail deles é legítimo).
-- ============================================================================

-- 1) Quem é admin. RLS ligada, ZERO grant direto — só as funções definer a leem.
create table if not exists public.admins (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on table public.admins from anon, authenticated;

-- BOOTSTRAP (troque o uuid pela conta que deve administrar):
--   insert into public.admins(user_id) values ('<uuid-da-dona>') on conflict do nothing;

create or replace function public.is_admin()
returns boolean language sql security definer set search_path to 'public' stable
as $$ select exists(select 1 from public.admins where user_id = auth.uid()); $$;
revoke all on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;

-- 2) Acesso ao beta (pausar/liberar a IA de uma conta).
create table if not exists public.beta_acesso (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  bloqueado     boolean not null default false,
  motivo        text,
  atualizado_em timestamptz not null default now()
);
alter table public.beta_acesso enable row level security;
revoke all on table public.beta_acesso from anon, authenticated;

-- A conta descobre o PRÓPRIO bloqueio; as funções de IA (Vercel) chamam isto com o
-- token do usuário para recusar quem foi pausado. Não vaza o bloqueio de terceiros.
create or replace function public.meu_acesso_bloqueado()
returns boolean language sql security definer set search_path to 'public' stable
as $$ select coalesce((select bloqueado from public.beta_acesso where user_id = auth.uid()), false); $$;
revoke all on function public.meu_acesso_bloqueado() from public, anon;
grant  execute on function public.meu_acesso_bloqueado() to authenticated;

-- 3) Caixa de bugs/feedback. Qualquer conta ENVIA (função); só admin LÊ.
create table if not exists public.feedback (
  id        bigint generated always as identity primary key,
  user_id   uuid references auth.users(id) on delete set null,
  email     text,
  mensagem  text not null,
  contexto  jsonb,
  lido      boolean not null default false,
  criado_em timestamptz not null default now()
);
alter table public.feedback enable row level security;
revoke all on table public.feedback from anon, authenticated;

create or replace function public.enviar_feedback(p_mensagem text, p_contexto jsonb)
returns void language plpgsql security definer set search_path to 'public'
as $$
declare em text;
begin
  if auth.uid() is null then raise exception 'nao_autenticado'; end if;
  if coalesce(trim(p_mensagem), '') = '' then raise exception 'vazio'; end if;
  select email into em from auth.users where id = auth.uid();
  insert into public.feedback(user_id, email, mensagem, contexto)
  values (auth.uid(), em, left(p_mensagem, 4000),
          case when p_contexto is null then null else jsonb_strip_nulls(p_contexto) end);
end $$;
revoke all on function public.enviar_feedback(text, jsonb) from public, anon;
grant  execute on function public.enviar_feedback(text, jsonb) to authenticated;

-- 4) Visão geral: saúde do beta + linha por testador. AGREGADO — sem texto de conteúdo.
create or replace function public.admin_visao_geral()
returns jsonb language plpgsql security definer set search_path to 'public' stable
as $$
declare res jsonb;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  select jsonb_build_object(
    'geradoEm', now(),
    'saude', (select jsonb_build_object(
        'contas',        count(*),
        'confirmados',   count(*) filter (where email_confirmed_at is not null),
        'ativos7d',      count(*) filter (where last_sign_in_at > now() - interval '7 days'),
        'ativos30d',     count(*) filter (where last_sign_in_at > now() - interval '30 days'),
        'nuncaVoltaram', count(*) filter (where last_sign_in_at is null
                                            or last_sign_in_at < created_at + interval '1 day')
      ) from auth.users where email not like '%@catedra.app'),
    'testadores', (select coalesce(jsonb_agg(t order by (t->>'ultimoLogin') desc nulls last), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'uid', u.id, 'email', u.email, 'criadoEm', u.created_at,
          'ultimoLogin', u.last_sign_in_at, 'ultimaSync', d.updated_at,
          'confirmado', (u.email_confirmed_at is not null),
          'bloqueado', coalesce(b.bloqueado, false),
          'admin', (a.user_id is not null),
          'nSessoes',    case when (d.data->>'catedra:sessions') ~ '^\[' then jsonb_array_length((d.data->>'catedra:sessions')::jsonb) else 0 end,
          'nDiscEdital', case when (d.data->>'catedra:edital')   ~ '^\[' then jsonb_array_length((d.data->>'catedra:edital')::jsonb)   else 0 end,
          'blobKb',      case when d.data is null then 0 else round(pg_column_size(d.data)/1024.0, 1) end
        ) t
        from auth.users u
        left join public.user_data   d on d.user_id = u.id
        left join public.beta_acesso b on b.user_id = u.id
        left join public.admins      a on a.user_id = u.id
        where u.email not like '%@catedra.app'
      ) s)
  ) into res;
  return res;
end $$;
revoke all on function public.admin_visao_geral() from public, anon;
grant  execute on function public.admin_visao_geral() to authenticated;

create or replace function public.admin_feedback()
returns setof public.feedback language plpgsql security definer set search_path to 'public' stable
as $$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  return query select * from public.feedback order by criado_em desc limit 200;
end $$;
revoke all on function public.admin_feedback() from public, anon;
grant  execute on function public.admin_feedback() to authenticated;

create or replace function public.admin_marcar_feedback(p_id bigint, p_lido boolean)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  update public.feedback set lido = coalesce(p_lido, true) where id = p_id;
end $$;
revoke all on function public.admin_marcar_feedback(bigint, boolean) from public, anon;
grant  execute on function public.admin_marcar_feedback(bigint, boolean) to authenticated;

-- Bloquear/liberar a IA de uma conta. Não dá para se auto-bloquear (trancaria a dona).
create or replace function public.admin_bloquear(p_user_id uuid, p_bloq boolean, p_motivo text)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  if p_user_id = auth.uid() then raise exception 'nao_bloqueie_a_si'; end if;
  insert into public.beta_acesso(user_id, bloqueado, motivo, atualizado_em)
  values (p_user_id, coalesce(p_bloq, false), p_motivo, now())
  on conflict (user_id) do update
    set bloqueado = excluded.bloqueado, motivo = excluded.motivo, atualizado_em = now();
end $$;
revoke all on function public.admin_bloquear(uuid, boolean, text) from public, anon;
grant  execute on function public.admin_bloquear(uuid, boolean, text) to authenticated;
