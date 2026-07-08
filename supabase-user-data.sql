-- ============================================================================
-- Cátedra · Proteção (RLS) da tabela user_data — o blob de dados de cada aluno
-- ----------------------------------------------------------------------------
-- Rode este script UMA VEZ no seu projeto Supabase:
--   Supabase → SQL Editor → New query → cole tudo → Run.
--
-- POR QUE ISSO IMPORTA: o app usa a chave "publishable" (pública por design) e
-- filtra por user_id só no CLIENTE. Sem Row Level Security no servidor,
-- qualquer usuário autenticado poderia ler/sobrescrever a linha de OUTRO
-- usuário. Estas policies garantem no banco que cada um só acessa a própria
-- linha (user_id = auth.uid()).
--
-- O script é idempotente: pode rodar de novo sem quebrar nada.
-- ============================================================================

-- 1) Tabela (cria se ainda não existir; se já existe, nada muda) --------------
create table if not exists public.user_data (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- 2) Liga o RLS ----------------------------------------------------------------
alter table public.user_data enable row level security;

-- 3) Policies: cada usuário só enxerga/edita a PRÓPRIA linha --------------------
drop policy if exists "user_data_select_own" on public.user_data;
create policy "user_data_select_own" on public.user_data
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_data_insert_own" on public.user_data;
create policy "user_data_insert_own" on public.user_data
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user_data_update_own" on public.user_data;
create policy "user_data_update_own" on public.user_data
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_data_delete_own" on public.user_data;
create policy "user_data_delete_own" on public.user_data
  for delete to authenticated
  using (user_id = auth.uid());

-- 4) Nada para o papel anon: sem policies para anon = sem acesso ----------------
revoke all on table public.user_data from anon;
grant  select, insert, update, delete on table public.user_data to authenticated;

-- Pronto. O app continua funcionando igual (ele já envia o JWT do usuário);
-- a diferença é que agora o BANCO recusa qualquer acesso à linha de outra conta.
