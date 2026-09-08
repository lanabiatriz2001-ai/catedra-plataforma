-- P18: cota diária de IA por conta, lida de uma tabela por plano (padrão 'beta' = 40 chamadas/dia,
-- configurável no console); a contagem reaproveita ai_uso (dia de Brasília). api/complete.js e api/tts.js
-- consultam minha_cota_ia() e respondem 429 com mensagem em português ao estourar. Fail-open em falha de rede.
-- Aplicada no projeto catedraplataforma (frcnfqxniwzdyykvgqqu) em 08/09/2026.
create table if not exists public.ia_cota (
  plano text primary key,
  chamadas_dia integer not null check (chamadas_dia >= 0 and chamadas_dia <= 100000),
  atualizado_em timestamptz not null default now()
);
insert into public.ia_cota (plano, chamadas_dia) values ('beta', 40) on conflict (plano) do nothing;
create table if not exists public.ia_plano (
  user_id uuid primary key,
  plano text not null references public.ia_cota (plano),
  atualizado_em timestamptz not null default now()
);
alter table public.ia_cota enable row level security;
alter table public.ia_plano enable row level security;
revoke all on public.ia_cota from anon, authenticated;
revoke all on public.ia_plano from anon, authenticated;

create or replace function public.minha_cota_ia()
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare uid uuid; pl text; lim int; usadas int; inicio timestamptz;
begin
  uid := auth.uid();
  if uid is null then raise exception 'nao_autenticado'; end if;
  pl := coalesce((select plano from public.ia_plano where user_id = uid), 'beta');
  lim := coalesce((select chamadas_dia from public.ia_cota where plano = pl), (select chamadas_dia from public.ia_cota where plano = 'beta'), 40);
  inicio := (date_trunc('day', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
  select count(*) into usadas from public.ai_uso where user_id = uid and criado_em >= inicio;
  return jsonb_build_object('plano', pl, 'limite', lim, 'usadas', usadas, 'restante', greatest(lim - usadas, 0));
end $function$;

create or replace function public.admin_ia_cota()
returns jsonb language sql stable security definer set search_path to 'public'
as $$ select case when public.is_admin() then coalesce((select jsonb_agg(jsonb_build_object('plano', plano, 'chamadasDia', chamadas_dia, 'contas', (select count(*) from public.ia_plano p where p.plano = c.plano)) order by plano) from public.ia_cota c), '[]'::jsonb) else null end; $$;

create or replace function public.admin_ia_cota_set(p_plano text, p_chamadas integer)
returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  if coalesce(trim(p_plano), '') = '' or p_chamadas is null or p_chamadas < 0 then raise exception 'valor_invalido'; end if;
  insert into public.ia_cota (plano, chamadas_dia, atualizado_em) values (lower(trim(p_plano)), p_chamadas, now())
    on conflict (plano) do update set chamadas_dia = excluded.chamadas_dia, atualizado_em = now();
  perform public._admin_log('ia_cota', lower(trim(p_plano)), jsonb_build_object('chamadasDia', p_chamadas));
end $function$;

create or replace function public.admin_ia_plano_set(p_uid uuid, p_plano text)
returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  if p_plano is null or p_plano = 'beta' then delete from public.ia_plano where user_id = p_uid;
  else insert into public.ia_plano (user_id, plano, atualizado_em) values (p_uid, p_plano, now()) on conflict (user_id) do update set plano = excluded.plano, atualizado_em = now(); end if;
  perform public._admin_log('ia_plano', p_uid::text, jsonb_build_object('plano', coalesce(p_plano, 'beta')));
end $function$;

revoke all on function public.minha_cota_ia() from public, anon;
revoke all on function public.admin_ia_cota() from public, anon;
revoke all on function public.admin_ia_cota_set(text, integer) from public, anon;
revoke all on function public.admin_ia_plano_set(uuid, text) from public, anon;
grant execute on function public.minha_cota_ia() to authenticated;
grant execute on function public.admin_ia_cota() to authenticated;
grant execute on function public.admin_ia_cota_set(text, integer) to authenticated;
grant execute on function public.admin_ia_plano_set(uuid, text) to authenticated;
