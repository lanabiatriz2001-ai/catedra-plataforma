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

-- A sincronização grava valores do localStorage como texto JSON. Aceitamos também
-- coleções JSON nativas de clientes antigos. Um campo ilegível não afeta as demais contas.
create or replace function public._json_estudo(v jsonb)
returns jsonb language plpgsql immutable strict set search_path to 'public'
as $$
begin
  if jsonb_typeof(v) = 'string' then return (v #>> '{}')::jsonb; end if;
  return v;
exception when data_exception or program_limit_exceeded then return null;
end $$;
revoke all on function public._json_estudo(jsonb) from public, anon;
grant execute on function public._json_estudo(jsonb) to authenticated;

create or replace function public._validar_colecoes_estudo()
returns trigger language plpgsql set search_path to 'public'
as $$
declare chave text; tipo text;
begin
  if tg_op = 'UPDATE' and old.data is not distinct from new.data then return null; end if;
  if jsonb_typeof(new.data) is distinct from 'object' then
    raise exception 'dados_de_estudo_invalidos' using errcode = '23514';
  end if;
  foreach chave in array array['catedra:edital','catedra:sessions','catedra:red','catedra:sim',
      'catedra:fc','catedra:errors','catedra:reviews','catedra:metas','catedra:eventos'] loop
    if not new.data ? chave then continue; end if;
    -- Preserva a parte legada ainda não editada; outro campo pode sincronizar normalmente.
    if tg_op = 'UPDATE' and (old.data->chave) is not distinct from (new.data->chave) then continue; end if;
    tipo := jsonb_typeof(public._json_estudo(new.data->chave));
    if tipo is distinct from 'array' and not (chave = 'catedra:sim' and coalesce(tipo = 'object', false)) then
      raise exception 'colecao_de_estudo_invalida: %', chave using errcode = '23514';
    end if;
  end loop;
  return null;
end $$;
revoke all on function public._validar_colecoes_estudo() from public, anon, authenticated;
-- AFTER distingue INSERT efetivo do UPDATE que um upsert faz sobre um registro legado.
drop trigger if exists validar_colecoes_estudo on public.user_data;
create trigger validar_colecoes_estudo after insert or update of data on public.user_data
for each row execute function public._validar_colecoes_estudo();

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
