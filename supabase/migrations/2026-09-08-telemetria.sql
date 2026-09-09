-- P17: telemetria de primeira parte (sem serviço de terceiros). DESLIGADA por padrão: app_config.telemetria
-- (interruptor no console de administração). O portão fica no servidor: com a chave desligada, as funções de
-- registro devolvem false e nada é gravado — o app também não envia.
-- Aplicada no projeto catedraplataforma (frcnfqxniwzdyykvgqqu) em 08/09/2026.
--
-- DADOS NOVOS TRATADOS quando ligada (para a Política de privacidade):
--   erros_cliente: user_id, versão do build, alvo (web/macOS/iPad), tela aberta, mensagem técnica do erro
--                  saneada no aparelho (e-mail, URL e token trocados por marcadores; ≤ 300 caracteres), data/hora.
--                  Teto de 50 por conta por dia. Sem IP, sem conteúdo de estudo.
--   uso_telas:     user_id, dia, nome da tela, número de aberturas (teto 500/dia/tela). Sem horário, sem conteúdo.
--   Leitura só pela administração (admin_erros_cliente, admin_uso_telas).
create table if not exists public.erros_cliente (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  build text, alvo text, tela text,
  mensagem text not null,
  ts timestamptz not null default now(),
  recebido_em timestamptz not null default now()
);
create index if not exists erros_cliente_recebido_idx on public.erros_cliente (recebido_em desc);
alter table public.erros_cliente enable row level security;
revoke all on public.erros_cliente from anon, authenticated;

create table if not exists public.uso_telas (
  user_id uuid not null,
  dia date not null,
  tela text not null,
  n integer not null default 0,
  up timestamptz not null default now(),
  primary key (user_id, dia, tela)
);
alter table public.uso_telas enable row level security;
revoke all on public.uso_telas from anon, authenticated;

create or replace function public.telemetria_ligada()
returns boolean language sql stable security definer set search_path to 'public'
as $$ select coalesce((select valor = 'true'::jsonb from public.app_config where chave = 'telemetria'), false); $$;

create or replace function public.registrar_erro_cliente(p_build text, p_alvo text, p_tela text, p_mensagem text, p_ts timestamptz)
returns boolean language plpgsql security definer set search_path to 'public'
as $function$
declare uid uuid; n int;
begin
  uid := auth.uid();
  if uid is null then raise exception 'nao_autenticado'; end if;
  if not public.telemetria_ligada() then return false; end if;
  if coalesce(trim(p_mensagem), '') = '' then return false; end if;
  select count(*) into n from public.erros_cliente where user_id = uid and recebido_em > now() - interval '1 day';
  if n >= 50 then return false; end if;
  insert into public.erros_cliente (user_id, build, alvo, tela, mensagem, ts)
    values (uid, left(coalesce(p_build,''), 40), left(coalesce(p_alvo,''), 20), left(coalesce(p_tela,''), 40), left(p_mensagem, 300), coalesce(p_ts, now()));
  return true;
end $function$;

create or replace function public.registrar_uso_telas(p_dia date, p_contagens jsonb)
returns boolean language plpgsql security definer set search_path to 'public'
as $function$
declare uid uuid; k text; v jsonb; q int; i int := 0;
begin
  uid := auth.uid();
  if uid is null then raise exception 'nao_autenticado'; end if;
  if not public.telemetria_ligada() then return false; end if;
  if p_dia is null or jsonb_typeof(p_contagens) <> 'object' then return false; end if;
  for k, v in select * from jsonb_each(p_contagens) loop
    i := i + 1; if i > 60 then exit; end if;
    begin q := least(greatest((v #>> '{}')::int, 0), 500); exception when others then q := 0; end;
    if q <= 0 then continue; end if;
    insert into public.uso_telas (user_id, dia, tela, n, up) values (uid, p_dia, left(k, 40), q, now())
      on conflict (user_id, dia, tela) do update set n = public.uso_telas.n + excluded.n, up = now();
  end loop;
  return true;
end $function$;

create or replace function public.admin_erros_cliente(p_horas integer)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare res jsonb;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'quando', ts, 'build', build, 'alvo', alvo, 'tela', tela, 'mensagem', mensagem, 'conta', left(user_id::text, 8)) order by ts desc), '[]'::jsonb)
    into res
    from (select * from public.erros_cliente where recebido_em > now() - make_interval(hours => coalesce(p_horas, 24)) order by ts desc limit 200) e;
  return res;
end $function$;

create or replace function public.admin_uso_telas(p_dias integer)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare res jsonb; d int := coalesce(p_dias, 7);
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  select jsonb_build_object(
    'dias', d,
    'porTela', (select coalesce(jsonb_agg(jsonb_build_object('tela', tela, 'n', n, 'contas', c) order by n desc), '[]'::jsonb)
                from (select tela, sum(n) n, count(distinct user_id) c from public.uso_telas where dia > current_date - d group by tela order by 2 desc limit 30) s),
    'porDia',  (select coalesce(jsonb_agg(jsonb_build_object('dia', dia, 'n', n, 'contas', c) order by dia), '[]'::jsonb)
                from (select dia, sum(n) n, count(distinct user_id) c from public.uso_telas where dia > current_date - d group by dia) s)
  ) into res;
  return res;
end $function$;

-- a chave 'telemetria' entra no interruptor da administração e no que o app lê em app_avisos
create or replace function public.admin_config_set(p_chave text, p_valor jsonb)
returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  if coalesce(trim(p_chave),'') = '' then raise exception 'chave_vazia'; end if;
  if p_chave not in ('ia_pausada','manutencao','aviso','telemetria') then raise exception 'chave_desconhecida'; end if;
  insert into public.app_config(chave, valor, atualizado_em)
  values (p_chave, coalesce(p_valor,'null'::jsonb), now())
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();
  perform public._admin_log('config', p_chave, coalesce(p_valor,'null'::jsonb));
end $function$;

create or replace function public.app_avisos()
returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select jsonb_build_object(
    'aviso',      coalesce((select valor->>'texto' from public.app_config where chave = 'aviso'), ''),
    'avisoTipo',  coalesce((select valor->>'tipo'  from public.app_config where chave = 'aviso'), 'info'),
    'manutencao', coalesce((select valor = 'true'::jsonb from public.app_config where chave = 'manutencao'), false),
    'iaPausada',  coalesce((select valor = 'true'::jsonb from public.app_config where chave = 'ia_pausada'), false),
    'telemetria', public.telemetria_ligada()
  )
$function$;

revoke all on function public.telemetria_ligada() from public, anon;
revoke all on function public.registrar_erro_cliente(text, text, text, text, timestamptz) from public, anon;
revoke all on function public.registrar_uso_telas(date, jsonb) from public, anon;
revoke all on function public.admin_erros_cliente(integer) from public, anon;
revoke all on function public.admin_uso_telas(integer) from public, anon;
grant execute on function public.telemetria_ligada() to authenticated;
grant execute on function public.registrar_erro_cliente(text, text, text, text, timestamptz) to authenticated;
grant execute on function public.registrar_uso_telas(date, jsonb) to authenticated;
grant execute on function public.admin_erros_cliente(integer) to authenticated;
grant execute on function public.admin_uso_telas(integer) to authenticated;
