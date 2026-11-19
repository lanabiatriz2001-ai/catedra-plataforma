-- Segurança do console e dos dados de uso. Aplicar depois das migrações de widget e telemetria.
-- O beta começa fechado sem configuração explícita. Para permitir todas as contas,
-- a administração liga beta_aberto no console; os convites existentes continuam válidos.
-- Nenhuma linha de estudo ou de telemetria legada é apagada por esta migração.
begin;
insert into public.app_config (chave, valor) values ('beta_aberto', 'false'::jsonb)
on conflict (chave) do nothing;


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

create or replace function public.meu_email_liberado()
returns boolean language plpgsql stable security definer set search_path to 'public'
as $$
begin
  return exists (
    select 1 from auth.users u where u.id = auth.uid() and (
      exists (select 1 from public.app_config where chave = 'beta_aberto' and valor = 'true'::jsonb)
      or exists (select 1 from public.beta_allow b where lower(b.email) = lower(u.email))
    )
  );
end $$;

create or replace function public._cta(d jsonb, k text)
returns int language sql immutable set search_path to 'public'
as $$
  select case when jsonb_typeof(v) = 'array' then jsonb_array_length(v) else 0 end
    from (select public._json_estudo(d->k) v) colecao;
$$;

create or replace function public.admin_apagar_grupo(p_id uuid)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  delete from public.grupos where id = p_id;   -- a FK do ranking cai em cascata
  if found then perform public._admin_log('apagar_grupo', p_id::text, null); end if;
end $$;

create or replace function public.admin_bloquear(p_user_id uuid, p_bloq boolean, p_motivo text)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  if p_user_id = auth.uid() then raise exception 'nao_bloqueie_a_si'; end if;
  insert into public.beta_acesso(user_id, bloqueado, motivo, atualizado_em)
  values (p_user_id, coalesce(p_bloq, false), p_motivo, now())
  on conflict (user_id) do update
    set bloqueado = excluded.bloqueado, motivo = excluded.motivo, atualizado_em = now()
    where (beta_acesso.bloqueado, beta_acesso.motivo) is distinct from (excluded.bloqueado, excluded.motivo);
  if found then
    perform public._admin_log('acesso_ia', p_user_id::text, jsonb_build_object('bloqueado', coalesce(p_bloq,false)));
  end if;
end $$;

create or replace function public.admin_allow_set(p_email text, p_incluir boolean)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  if coalesce(trim(p_email),'')='' then raise exception 'email_vazio'; end if;
  if p_incluir then
    insert into public.beta_allow(email) values (lower(trim(p_email))) on conflict (email) do nothing;
  else
    delete from public.beta_allow where email = lower(trim(p_email));
  end if;
  if found then
    perform public._admin_log(case when p_incluir then 'incluir_convite' else 'retirar_convite' end, lower(trim(p_email)), null);
  end if;
end $$;

create or replace function public.admin_desconectar(p_uid uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare em text; n int; passes int := 0; resumo jsonb;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  select email into em from auth.users where id = p_uid;
  if em is null then raise exception 'nao_encontrado'; end if;
  delete from auth.sessions where user_id = p_uid;
  get diagnostics n = row_count;
  if to_regclass('public.widget_passe') is not null then
    update public.widget_passe set revogado_em = now() where user_id = p_uid and revogado_em is null;
    get diagnostics passes = row_count;
  end if;
  resumo := jsonb_build_object('sessoes', n, 'passesRevogados', passes);
  perform public._admin_log('desconectar', em, resumo);
  return resumo;
end $$;

create or replace function public.admin_config_set(p_chave text, p_valor jsonb)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  if coalesce(trim(p_chave),'') = '' then raise exception 'chave_vazia'; end if;
  -- lista fechada: o painel não vira um editor de banco genérico
  if p_chave not in ('ia_pausada','manutencao','aviso','telemetria','beta_aberto') then raise exception 'chave_desconhecida'; end if;
  if p_chave = 'beta_aberto' and jsonb_typeof(p_valor) is distinct from 'boolean' then
    raise exception 'valor_invalido';
  end if;
  insert into public.app_config(chave, valor, atualizado_em)
  values (p_chave, coalesce(p_valor,'null'::jsonb), now())
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();
  perform public._admin_log('config', p_chave, coalesce(p_valor,'null'::jsonb));
end $$;

create or replace function public.widget_passe_emitir(p_aparelho text)
returns text language plpgsql security definer set search_path to 'public'
as $function$
declare uid uuid; passe text;
begin
  uid := auth.uid();
  if uid is null then raise exception 'nao_autenticado'; end if;
  -- Um token ainda pode estar no prazo após a desconexão. A trava na sessão
  -- faz uma emissão já iniciada terminar antes de a administração revogar seus passes.
  perform 1 from auth.sessions where user_id = uid and id::text = auth.jwt()->>'session_id' for key share;
  if not found then raise exception 'sessao_inativa'; end if;
  passe := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  insert into public.widget_passe (user_id, hash, aparelho)
    values (uid, encode(extensions.digest(passe, 'sha256'), 'hex'), left(coalesce(trim(p_aparelho), ''), 60));
  update public.widget_passe set revogado_em = now()
   where id in (select id from public.widget_passe
                 where user_id = uid and revogado_em is null
                 order by criado_em desc offset 10);
  return passe;
end $function$;

-- Nomes das telas do host. O painel também filtra nomes não reconhecidos do legado.
create or replace function public._tela_de_uso(p_tela text)
returns boolean language sql immutable strict set search_path to 'public'
as $$
  select p_tela = any(array[
    'admin','ajustes','analise','anki','areamod','bancas','bemestar','calendario','casos','ciclo',
    'comunidade','conquistas','dashboards','dominio','edital','erros','flashcards','historico','inicio',
    'juris','legis','metas','multiformato','novidades','oab','oral','orientacao','personalizacao',
    'planejamento','prioridade','redacao','relatorio','reta-final','revisoes','roteiros','segundafase','simulados'
  ]);
$$;
revoke all on function public._tela_de_uso(text) from public, anon, authenticated;

create or replace function public.registrar_uso_telas(p_dia date, p_contagens jsonb)
returns boolean language plpgsql security definer set search_path to 'public'
as $function$
declare uid uuid; k text; v jsonb; q int;
begin
  uid := auth.uid();
  if uid is null then raise exception 'nao_autenticado'; end if;
  if not public.telemetria_ligada() then return false; end if;
  if p_dia is null or p_dia > current_date or jsonb_typeof(p_contagens) is distinct from 'object' then return false; end if;
  -- A fila pode ter estudado offline. Aceita desde a criação da conta, com margem para o dia local.
  if not exists (select 1 from auth.users where id = uid and p_dia >= created_at::date - 1) then return false; end if;
  for k, v in select key, value from jsonb_each(p_contagens) where public._tela_de_uso(key) loop
    begin q := least(greatest((v #>> '{}')::int, 0), 500); exception when others then q := 0; end;
    if q <= 0 then continue; end if;
    insert into public.uso_telas (user_id, dia, tela, n, up) values (uid, p_dia, k, q, now())
      on conflict (user_id, dia, tela) do update set n = least(500, greatest(0, least(public.uso_telas.n, 500)) + excluded.n), up = now();
  end loop;
  return true;
end $function$;

create or replace function public.admin_uso_telas(p_dias integer)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare res jsonb; d int := coalesce(p_dias, 7);
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  with registros as (
    select user_id, dia, tela, greatest(0, least(n, 500)) n from public.uso_telas
    where dia > current_date - d and dia <= current_date and public._tela_de_uso(tela)
  )
  select jsonb_build_object(
    'dias', d,
    'porTela', (select coalesce(jsonb_agg(jsonb_build_object('tela', tela, 'n', n, 'contas', c) order by n desc), '[]'::jsonb)
                from (select tela, sum(n) n, count(distinct user_id) c from registros group by tela order by 2 desc limit 30) s),
    'porDia',  (select coalesce(jsonb_agg(jsonb_build_object('dia', dia, 'n', n, 'contas', c) order by dia), '[]'::jsonb)
                from (select dia, sum(n) n, count(distinct user_id) c from registros group by dia) s)
  ) into res;
  return res;
end $function$;

commit;
