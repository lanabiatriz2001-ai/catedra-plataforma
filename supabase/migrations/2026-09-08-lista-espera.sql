-- P15: lista de espera da página pública (sobre.html).
-- Inserção anônima (chave pública do site), leitura só pela administração (RPC admin_lista_espera).
-- Aplicada no projeto catedraplataforma (frcnfqxniwzdyykvgqqu) em 08/09/2026; conferido: anon insere, anon não lê.
create table if not exists public.lista_espera (
  id bigint generated always as identity primary key,
  email text not null,
  area text,
  origem text,
  criado_em timestamptz not null default now(),
  constraint lista_espera_email_chk check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' and length(email) <= 254),
  constraint lista_espera_area_chk check (area is null or length(area) <= 60),
  constraint lista_espera_origem_chk check (origem is null or length(origem) <= 60)
);
create unique index if not exists lista_espera_email_uidx on public.lista_espera (lower(email));
alter table public.lista_espera enable row level security;
drop policy if exists lista_espera_insert_anon on public.lista_espera;
create policy lista_espera_insert_anon on public.lista_espera for insert to anon, authenticated with check (true);
revoke all on public.lista_espera from anon, authenticated;
grant insert (email, area, origem) on public.lista_espera to anon, authenticated;
create or replace function public.admin_lista_espera()
returns setof public.lista_espera
language sql
stable security definer
set search_path to 'public'
as $$ select * from public.lista_espera where public.is_admin() order by criado_em desc; $$;
revoke all on function public.admin_lista_espera() from public, anon;
grant execute on function public.admin_lista_espera() to authenticated;
